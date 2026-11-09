"""
Servidor de DESENVOLVIMENTO com API mockada — uso exclusivo em localhost.

    python mock/server.py            # http://localhost:8765
    python mock/server.py 9000       # outra porta

- Serve os arquivos estáticos do site (raiz do repositório).
- Responde em /mock-api/... imitando a API .NET (/api/...), lendo e gravando
  em mock/db.json. Na primeira execução o db.json é criado a partir de
  mock/seed.json. Para zerar os dados, apague mock/db.json.
- Uploads de imagem vão para mock/uploads/.

NUNCA usar em produção: o servidor só escuta em 127.0.0.1, e o front só aponta
para /mock-api quando o hostname é localhost/127.0.0.1 (ver scripts/auth.js).
Sem dependências externas (somente biblioteca padrão do Python 3).
"""

import json
import os
import re
import sys
import threading
import uuid
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

MOCK_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(MOCK_DIR)
SEED_PATH = os.path.join(MOCK_DIR, "seed.json")
DB_PATH = os.path.join(MOCK_DIR, "db.json")
UPLOADS_DIR = os.path.join(MOCK_DIR, "uploads")
PREFIX = "/mock-api"
HOST = "127.0.0.1"
MOCK_TOKEN = "mock-token"
IMG_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
ORIGENS_LOCAIS = re.compile(r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$")

_lock = threading.Lock()


# ── Banco em JSON ─────────────────────────────────────────────────────────────

def carregar_db():
    if not os.path.exists(DB_PATH):
        with open(SEED_PATH, encoding="utf-8") as f:
            db = json.load(f)
        salvar_db(db)
        return db
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def salvar_db(db):
    tmp = DB_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
    os.replace(tmp, DB_PATH)


def proximo_id(itens):
    return max((i["id"] for i in itens), default=0) + 1


def proximo_id_imagem(db):
    ids = [img["id"] for col in ("estabelecimentos", "cupons") for item in db[col] for img in item.get("imagens", [])]
    return max(ids, default=0) + 1


def achar(itens, id_):
    return next((i for i in itens if i["id"] == id_), None)


def ints(valores):
    out = []
    for v in valores or []:
        try:
            out.append(int(v))
        except (TypeError, ValueError):
            pass
    return out


# ── Formatação das respostas (mesmo formato que o painel espera da API) ──────

def montar_estab(db, e):
    cidade = achar(db["cidades"], e.get("cidadeId"))
    uf = achar(db["unidadesFederativas"], cidade["unidadeFederativaId"]) if cidade else None
    imagens = e.get("imagens", [])
    principal = next((i for i in imagens if i.get("fachada")), None) or next((i for i in imagens if i.get("principal")), None)
    return {
        **{k: v for k, v in e.items() if k not in ("categoriaIds", "cartoesAceitosIds")},
        "nomeFantasia": e.get("nome", ""),
        "status": e.get("statusPublicacao", ""),
        "categoriaIds": e.get("categoriaIds", []),
        "categorias": [c["nome"] for c in db["categorias"] if c["id"] in e.get("categoriaIds", [])],
        "cidade": cidade["nome"] if cidade else "",
        "unidadeFederativaId": uf["id"] if uf else None,
        "unidadeFederativa": uf["sigla"] if uf else "",
        "cartoesAceitos": [c for c in db["cartoes"] if c["id"] in e.get("cartoesAceitosIds", [])],
        "imagemPrincipal": principal["url"] if principal else None,
    }


def montar_cupom(db, c):
    estab = achar(db["estabelecimentos"], c.get("estabelecimentoId"))
    return {
        **{k: v for k, v in c.items() if k != "cartoesAceitosIds"},
        "estabelecimentoIds": [c.get("estabelecimentoId")],
        "nomeEstabelecimento": estab["nome"] if estab else "",
        "cartoesAceitos": [x for x in db["cartoes"] if x["id"] in c.get("cartoesAceitosIds", [])],
    }


def montar_grupo(db, g):
    estabs = [e for e in db["estabelecimentos"] if e.get("grupoId") == g["id"]]
    return {
        **g,
        "estabelecimentos": [{"id": e["id"], "nome": e["nome"]} for e in estabs],
        "estabelecimentosCount": len(estabs),
    }


CAMPOS_ESTAB = [
    "nome", "razaoSocial", "cnpj", "telefone", "emailContato", "ativo",
    "rua", "numero", "bairro", "complemento", "cep", "latitude", "longitude",
    "grupoId", "mapaUrl", "sobre", "statusPublicacao", "statusOperacional",
    "motivoCancelamento", "consultorNome", "consultorEmail",
    "representanteLegalNome", "cpfRepresentante", "segundoContatoNome",
    "segundoContatoTelefone", "segundoContatoCargo",
]

CAMPOS_CUPOM = [
    "codigo", "titulo", "descricao", "modalTitulo", "modalDescricao", "tipo",
    "tag", "valorDesconto", "valorMinimoCompra", "dataInicio", "dataExpiracao",
    "limiteUso", "limiteUsoPorUsuario", "ativo", "status", "estabelecimentoId",
]


def aplicar_estab(e, body):
    for k in CAMPOS_ESTAB:
        if k in body:
            e[k] = body[k]
    if body.get("cidadeId"):
        e["cidadeId"] = int(body["cidadeId"])
    if body.get("categoriaId"):
        e["categoriaIds"] = [int(body["categoriaId"])]
    if "cartoesAceitosIds" in body:
        e["cartoesAceitosIds"] = ints(body["cartoesAceitosIds"])


def aplicar_cupom(c, body):
    for k in CAMPOS_CUPOM:
        if k in body:
            c[k] = body[k]
    if "cartoesAceitosIds" in body:
        c["cartoesAceitosIds"] = ints(body["cartoesAceitosIds"])
    if "status" in body and "ativo" not in body:
        c["ativo"] = body["status"] == "Publicado"


# ── Uploads ──────────────────────────────────────────────────────────────────

def ler_multipart(content_type, corpo):
    msg = BytesParser(policy=email_policy).parsebytes(
        b"Content-Type: " + content_type.encode() + b"\r\n\r\n" + corpo
    )
    campos, arquivos = {}, {}
    for parte in msg.iter_parts():
        nome = parte.get_param("name", header="content-disposition")
        if parte.get_filename():
            arquivos[nome] = (parte.get_filename(), parte.get_payload(decode=True))
        else:
            campos.setdefault(nome, []).append(parte.get_content().strip())
    return campos, arquivos


def salvar_upload(nome_arquivo, dados, base=""):
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    ext = os.path.splitext(nome_arquivo or "")[1].lower()
    if ext not in IMG_EXTS:
        ext = ".bin"
    nome = uuid.uuid4().hex + ext
    with open(os.path.join(UPLOADS_DIR, nome), "wb") as f:
        f.write(dados)
    return base + "/mock/uploads/" + nome


# ── Rotas ────────────────────────────────────────────────────────────────────

class Erro(Exception):
    def __init__(self, status, msg):
        super().__init__(msg)
        self.status, self.msg = status, msg


ROTAS = []


def rota(metodo, padrao):
    def deco(fn):
        ROTAS.append((metodo, re.compile("^" + padrao + "$", re.IGNORECASE), fn))
        return fn
    return deco


def estab_ou_404(db, id_):
    e = achar(db["estabelecimentos"], int(id_))
    if not e:
        raise Erro(404, f"Estabelecimento {id_} não encontrado")
    return e


def cupom_ou_404(db, id_):
    c = achar(db["cupons"], int(id_))
    if not c:
        raise Erro(404, f"Cupom {id_} não encontrado")
    return c


# Auth
@rota("POST", r"/api/Auth/login")
def auth_login(db, req, **_):
    return {"token": MOCK_TOKEN, "accessToken": MOCK_TOKEN}


@rota("POST", r"/api/Auth/client-token")
def auth_client(db, req, **_):
    return {"accessToken": MOCK_TOKEN}


# Catálogos
@rota("GET", r"/api/CategoriasEstabelecimentos")
def categorias(db, req, **_):
    return db["categorias"]


@rota("POST", r"/api/CategoriasEstabelecimentos")
def criar_categoria(db, req, **_):
    nome = (req.json() or {}).get("nome", "").strip()
    if not nome:
        raise Erro(400, "Nome da categoria é obrigatório")
    cat = {"id": proximo_id(db["categorias"]), "nome": nome}
    db["categorias"].append(cat)
    req.mudou = True
    return cat


@rota("DELETE", r"/api/CategoriasEstabelecimentos/(?P<id>\d+)")
def apagar_categoria(db, req, id):
    db["categorias"] = [c for c in db["categorias"] if c["id"] != int(id)]
    req.mudou = True
    return None


@rota("GET", r"/api/Cartoes")
def cartoes(db, req, **_):
    return db["cartoes"]


@rota("GET", r"/api/UnidadesFederativas(/por-estabelecimento)?")
def ufs(db, req, **_):
    return db["unidadesFederativas"]


@rota("GET", r"/api/Cidades/por-(estado|estabelecimento)/(?P<id>\d+)")
def cidades(db, req, id, **_):
    return [{"id": c["id"], "nome": c["nome"]} for c in db["cidades"] if c["unidadeFederativaId"] == int(id)]


# Estabelecimentos
@rota("GET", r"/api/Estabelecimentos")
def listar_estabs(db, req, **_):
    return [montar_estab(db, e) for e in db["estabelecimentos"]]


@rota("GET", r"/api/Estabelecimentos/(?P<id>\d+)")
def obter_estab(db, req, id):
    return montar_estab(db, estab_ou_404(db, id))


@rota("POST", r"/api/Estabelecimentos(/Criar)?")
def criar_estab(db, req, **_):
    body = req.json() or {}
    if not str(body.get("nome", "")).strip():
        raise Erro(400, "Nome do estabelecimento é obrigatório")
    e = {"id": proximo_id(db["estabelecimentos"]), "categoriaIds": [], "cartoesAceitosIds": [], "imagens": []}
    aplicar_estab(e, body)
    db["estabelecimentos"].append(e)
    req.mudou = True
    return montar_estab(db, e)


@rota("PUT", r"/api/Estabelecimentos/(?P<id>\d+)")
def editar_estab(db, req, id):
    e = estab_ou_404(db, id)
    aplicar_estab(e, req.json() or {})
    req.mudou = True
    return montar_estab(db, e)


@rota("DELETE", r"/api/Estabelecimentos/(?P<id>\d+)")
def apagar_estab(db, req, id):
    estab_ou_404(db, id)
    db["estabelecimentos"] = [e for e in db["estabelecimentos"] if e["id"] != int(id)]
    db["cupons"] = [c for c in db["cupons"] if c.get("estabelecimentoId") != int(id)]
    req.mudou = True
    return None


@rota("PATCH", r"/api/Estabelecimentos/(?P<id>\d+)/status")
def status_estab(db, req, id):
    e = estab_ou_404(db, id)
    body = req.json() or {}
    for k in ("statusPublicacao", "statusOperacional"):
        if k in body:
            e[k] = body[k]
    req.mudou = True
    return montar_estab(db, e)


@rota("POST", r"/api/Estabelecimentos/(?P<id>\d+)/vincular-categorias")
def vincular_categorias(db, req, id):
    e = estab_ou_404(db, id)
    e["categoriaIds"] = ints(req.json())
    req.mudou = True
    return montar_estab(db, e)


@rota("POST", r"/api/Cartoes/(?P<id>\d+)/vincular-estabelecimento")
def vincular_cartoes(db, req, id):
    e = estab_ou_404(db, id)
    e["cartoesAceitosIds"] = ints(req.json())
    req.mudou = True
    return montar_estab(db, e)


@rota("POST", r"/api/Estabelecimentos/(?P<id>\d+)/imagens")
def upload_img_estab(db, req, id):
    e = estab_ou_404(db, id)
    _, arquivos = req.multipart()
    if "imagem" not in arquivos:
        raise Erro(400, "Arquivo 'imagem' não enviado")
    q = req.query
    flag = lambda k: q.get(k, ["false"])[0].lower() == "true"
    logo, fachada = flag("logo"), flag("fachada")
    # Mantém uma só imagem de logo e uma só de fachada
    e["imagens"] = [i for i in e.get("imagens", []) if not ((logo and i.get("logo")) or (fachada and i.get("fachada")))]
    img = {"id": proximo_id_imagem(db), "url": salvar_upload(*arquivos["imagem"], req.base),
           "principal": flag("principal"), "logo": logo, "fachada": fachada}
    e["imagens"].append(img)
    req.mudou = True
    return img


@rota("DELETE", r"/api/Estabelecimentos/(?P<id>\d+)/imagens/(?P<img>\d+)")
def apagar_img_estab(db, req, id, img):
    e = estab_ou_404(db, id)
    e["imagens"] = [i for i in e.get("imagens", []) if i["id"] != int(img)]
    req.mudou = True
    return None


# Grupos
@rota("GET", r"/api/Grupos(/grupos-ativos)?")
def grupos(db, req, **_):
    return [montar_grupo(db, g) for g in db["grupos"] if g.get("ativo", True)]


@rota("POST", r"/api/Grupos/criar")
def criar_grupo(db, req, **_):
    campos, arquivos = req.multipart()
    nome = (campos.get("Nome") or [""])[0]
    if not nome:
        raise Erro(400, "Nome do grupo é obrigatório")
    g = {
        "id": proximo_id(db["grupos"]),
        "nome": nome,
        "siteURL": (campos.get("SiteURL") or [""])[0],
        "ativo": (campos.get("Ativo") or ["true"])[0].lower() == "true",
        "logoCaminho": salvar_upload(*arquivos["LogoCaminho"], req.base) if "LogoCaminho" in arquivos else None,
    }
    db["grupos"].append(g)
    for eid in ints(campos.get("EstabelecimentosIds")):
        e = achar(db["estabelecimentos"], eid)
        if e:
            e["grupoId"] = g["id"]
    req.mudou = True
    return montar_grupo(db, g)


@rota("POST", r"/api/Grupos/(?P<id>\d+)/vincular-estabelecimentos/(?P<eid>\d+)")
def vincular_grupo(db, req, id, eid):
    if not achar(db["grupos"], int(id)):
        raise Erro(404, f"Grupo {id} não encontrado")
    estab_ou_404(db, eid)["grupoId"] = int(id)
    req.mudou = True
    return None


@rota("GET", r"/api/Grupos/(?P<id>\d+)/estabelecimentos-por-grupo")
def estabs_do_grupo(db, req, id):
    return [montar_estab(db, e) for e in db["estabelecimentos"] if e.get("grupoId") == int(id)]


@rota("DELETE", r"/api/Grupos/(?P<id>\d+)")
def apagar_grupo(db, req, id):
    if any(e.get("grupoId") == int(id) for e in db["estabelecimentos"]):
        raise Erro(409, "O grupo tem estabelecimentos vinculados")
    db["grupos"] = [g for g in db["grupos"] if g["id"] != int(id)]
    req.mudou = True
    return None


# Cupons
@rota("GET", r"/api/Cupons")
def listar_cupons(db, req, **_):
    return [montar_cupom(db, c) for c in db["cupons"]]


@rota("GET", r"/api/Cupons/por-estabelecimento/(?P<id>\d+)")
def cupons_do_estab(db, req, id):
    return [montar_cupom(db, c) for c in db["cupons"] if c.get("estabelecimentoId") == int(id)]


@rota("GET", r"/api/Cupons/(?P<id>\d+)")
def obter_cupom(db, req, id):
    return montar_cupom(db, cupom_ou_404(db, id))


@rota("POST", r"/api/Cupons")
def criar_cupom(db, req, **_):
    body = req.json() or {}
    if not body.get("estabelecimentoId") or not achar(db["estabelecimentos"], int(body["estabelecimentoId"])):
        raise Erro(400, "estabelecimentoId inválido")
    c = {"id": proximo_id(db["cupons"]), "cartoesAceitosIds": [], "imagens": []}
    aplicar_cupom(c, body)
    c["estabelecimentoId"] = int(c["estabelecimentoId"])
    db["cupons"].append(c)
    req.mudou = True
    return montar_cupom(db, c)


@rota("PUT", r"/api/Cupons/(?P<id>\d+)")
def editar_cupom(db, req, id):
    c = cupom_ou_404(db, id)
    aplicar_cupom(c, req.json() or {})
    req.mudou = True
    return montar_cupom(db, c)


@rota("DELETE", r"/api/Cupons/(?P<id>\d+)")
def apagar_cupom(db, req, id):
    cupom_ou_404(db, id)
    db["cupons"] = [c for c in db["cupons"] if c["id"] != int(id)]
    req.mudou = True
    return None


@rota("PATCH", r"/api/Cupons/(?P<id>\d+)/status")
def status_cupom(db, req, id):
    c = cupom_ou_404(db, id)
    status = req.json()
    if isinstance(status, dict):
        status = status.get("status")
    c["status"] = status
    c["ativo"] = status == "Publicado"
    req.mudou = True
    return montar_cupom(db, c)


@rota("GET", r"/api/Cupons/(?P<id>\d+)/imagens")
def imagens_cupom(db, req, id):
    return cupom_ou_404(db, id).get("imagens", [])


@rota("POST", r"/api/Cupons/(?P<id>\d+)/imagens")
def upload_img_cupom(db, req, id):
    c = cupom_ou_404(db, id)
    _, arquivos = req.multipart()
    if "imagem" not in arquivos:
        raise Erro(400, "Arquivo 'imagem' não enviado")
    tipo = int(req.query.get("imagemTipoId", ["1"])[0])
    c["imagens"] = [i for i in c.get("imagens", []) if i.get("imagemTipoId") != tipo]
    img = {"id": proximo_id_imagem(db), "url": salvar_upload(*arquivos["imagem"], req.base), "imagemTipoId": tipo}
    c["imagens"].append(img)
    req.mudou = True
    return img


@rota("DELETE", r"/api/Cupons/(?P<id>\d+)/imagens/(?P<img>\d+)")
def apagar_img_cupom(db, req, id, img):
    c = cupom_ou_404(db, id)
    c["imagens"] = [i for i in c.get("imagens", []) if i["id"] != int(img)]
    req.mudou = True
    return None


# ── HTTP ─────────────────────────────────────────────────────────────────────

class Requisicao:
    def __init__(self, handler, corpo, query):
        self.handler, self.corpo, self.query, self.mudou = handler, corpo, query, False
        # URL absoluta do mock, para imagens enviadas funcionarem em qualquer porta local
        self.base = "http://" + (handler.headers.get("Host") or f"localhost:{handler.server.server_port}")

    def json(self):
        if not self.corpo:
            return None
        try:
            return json.loads(self.corpo.decode("utf-8"))
        except ValueError:
            raise Erro(400, "JSON inválido")

    def multipart(self):
        ctype = self.handler.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            raise Erro(400, "Esperado multipart/form-data")
        return ler_multipart(ctype, self.corpo)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Nunca deixar o navegador cachear durante o desenvolvimento
        self.send_header("Cache-Control", "no-store")
        # CORS liberado SOMENTE para páginas servidas em localhost (ex.: Live Server)
        origem = self.headers.get("Origin", "")
        if ORIGENS_LOCAIS.match(origem):
            self.send_header("Access-Control-Allow-Origin", origem)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, fmt, *args):
        if self.path.startswith(PREFIX):
            sys.stderr.write("[mock] %s\n" % (fmt % args))

    def _mock(self, metodo):
        url = urlparse(self.path)
        if not url.path.startswith(PREFIX):
            if metodo in ("GET", "HEAD"):
                return super().do_GET() if metodo == "GET" else super().do_HEAD()
            return self._responder(405, {"erro": "Método não suportado para arquivos estáticos"})

        caminho = url.path[len(PREFIX):].rstrip("/") or "/"
        tamanho = int(self.headers.get("Content-Length") or 0)
        corpo = self.rfile.read(tamanho) if tamanho else b""
        req = Requisicao(self, corpo, parse_qs(url.query))

        for m, padrao, fn in ROTAS:
            achou = padrao.match(caminho)
            if m == metodo and achou:
                try:
                    with _lock:
                        db = carregar_db()
                        resultado = fn(db, req, **{k: v for k, v in achou.groupdict().items() if v is not None})
                        if req.mudou:
                            salvar_db(db)
                    if resultado is None:
                        return self._responder(204, None)
                    return self._responder(201 if metodo == "POST" else 200, resultado)
                except Erro as e:
                    return self._responder(e.status, {"erro": e.msg})

        sys.stderr.write(f"[mock] ROTA NÃO IMPLEMENTADA: {metodo} {caminho}\n")
        return self._responder(404, {"erro": "Rota não implementada no mock", "metodo": metodo, "caminho": caminho})

    def _responder(self, status, dados):
        self.send_response(status)
        if dados is None:
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        corpo = json.dumps(dados, ensure_ascii=False).encode("utf-8")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_GET(self):
        self._mock("GET")

    def do_HEAD(self):
        self._mock("HEAD")

    def do_POST(self):
        self._mock("POST")

    def do_PUT(self):
        self._mock("PUT")

    def do_PATCH(self):
        self._mock("PATCH")

    def do_DELETE(self):
        self._mock("DELETE")


def main():
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    carregar_db()
    servidor = ThreadingHTTPServer((HOST, porta), Handler)
    print(f"Site + API MOCK em http://localhost:{porta}  (dados: {os.path.relpath(DB_PATH, ROOT)})")
    print("Somente para desenvolvimento local. Ctrl+C para parar.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

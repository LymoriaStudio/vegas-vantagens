"""
Importa os cupons de data/cupons.json para a API (POST /api/Cupons).

Para cada cupom, faz um POST por loja (lojas.estabelecimentoIds), usando o
bloco "post" do JSON como corpo, e depois envia as imagens.

Uso:
    python tools/importar-cupons.py --api https://apiclubedevantagens.vegascard.com.br --simular
    python tools/importar-cupons.py --api https://apiclubedevantagens.vegascard.com.br --email voce@vegascard.com.br
    python tools/importar-cupons.py --api http://localhost:8765/mock-api          (testar no mock local)

Opções:
    --simular        só mostra o que seria enviado (não chama a API, não pede senha)
    --cupom CHAVE    importa só um cupom (ex.: --cupom pasteur-hemograma); pode repetir
    --loja ID        importa só para uma loja (ex.: --loja 31); pode repetir
    --token TOKEN    usa um token já obtido em vez de fazer login

A senha é pedida no terminal (não fica salva em lugar nenhum).
Sem dependências: somente a biblioteca padrão do Python 3.
"""

import argparse
import getpass
import json
import mimetypes
import os
import sys
import unicodedata
import urllib.error
import urllib.request
import uuid

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARQUIVO = os.path.join(RAIZ, "data", "cupons.json")


def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto or ""))
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").lower().strip()


def requisicao(metodo, url, token=None, corpo=None, tipo="application/json"):
    cabecalhos = {"Accept": "application/json"}
    if token:
        cabecalhos["Authorization"] = f"Bearer {token}"
    dados = None
    if corpo is not None:
        dados = corpo if isinstance(corpo, bytes) else json.dumps(corpo).encode("utf-8")
        cabecalhos["Content-Type"] = tipo
    req = urllib.request.Request(url, data=dados, method=metodo, headers=cabecalhos)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            texto = r.read().decode("utf-8") or "null"
            return r.status, json.loads(texto) if texto.strip()[:1] in "[{\"" or texto == "null" else texto
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except urllib.error.URLError as e:
        sys.exit(f"Não foi possível conectar em {url}: {e.reason}")


def multipart(campo, caminho_arquivo):
    fronteira = uuid.uuid4().hex
    nome = os.path.basename(caminho_arquivo)
    tipo = mimetypes.guess_type(nome)[0] or "application/octet-stream"
    with open(caminho_arquivo, "rb") as f:
        conteudo = f.read()
    corpo = (
        f"--{fronteira}\r\nContent-Disposition: form-data; name=\"{campo}\"; filename=\"{nome}\"\r\n"
        f"Content-Type: {tipo}\r\n\r\n"
    ).encode("utf-8") + conteudo + f"\r\n--{fronteira}--\r\n".encode("utf-8")
    return corpo, f"multipart/form-data; boundary={fronteira}"


def main():
    ap = argparse.ArgumentParser(description="Importa data/cupons.json na API (POST /api/Cupons).")
    ap.add_argument("--api", required=True, help="URL base da API, ex.: https://apiclubedevantagens.vegascard.com.br")
    ap.add_argument("--email")
    ap.add_argument("--token")
    ap.add_argument("--simular", action="store_true")
    ap.add_argument("--cupom", action="append", default=[])
    ap.add_argument("--loja", action="append", type=int, default=[])
    args = ap.parse_args()
    api = args.api.rstrip("/")

    dados = json.load(open(ARQUIVO, encoding="utf-8"))
    cupons = dados["cupons"] if isinstance(dados, dict) else dados
    if args.cupom:
        cupons = [c for c in cupons if c["chave"] in args.cupom]
        if not cupons:
            sys.exit(f"Nenhum cupom com chave {args.cupom}")

    token = args.token
    if not args.simular and not token:
        email = args.email or input("E-mail do admin: ").strip()
        senha = getpass.getpass("Senha: ")
        status, resp = requisicao("POST", f"{api}/api/Auth/login", corpo={"email": email, "senha": senha})
        token = resp.get("token") or resp.get("accessToken") if isinstance(resp, dict) else None
        if status >= 400 or not token:
            sys.exit(f"Falha no login (HTTP {status}): {str(resp)[:300]}")
        print("Login ok.")

    # cartões: nome -> id (se a API tiver o endpoint)
    ids_cartao = {}
    if not args.simular:
        status, resp = requisicao("GET", f"{api}/api/Cartoes", token)
        if status == 200 and isinstance(resp, list):
            ids_cartao = {normalizar(c["nome"]): c["id"] for c in resp}
        else:
            print(f"Aviso: GET /api/Cartoes indisponível (HTTP {status}); cartoesAceitosIds irá vazio.")

    total_ok = total_erro = 0
    for cupom in cupons:
        lojas = cupom["lojas"]["estabelecimentoIds"]
        if args.loja:
            lojas = [l for l in lojas if l in args.loja]
        cartoes = [ids_cartao[normalizar(n)] for n in cupom.get("cartoesAceitos", []) if normalizar(n) in ids_cartao]
        faltando = [n for n in cupom.get("cartoesAceitos", []) if ids_cartao and normalizar(n) not in ids_cartao]
        if faltando:
            print(f"  Aviso [{cupom['chave']}]: cartões sem id na API: {faltando}")

        for loja in lojas:
            corpo = {**cupom["post"], "estabelecimentoId": loja, "cartoesAceitosIds": cartoes or cupom["post"].get("cartoesAceitosIds", [])}
            rotulo = f"{cupom['chave']} -> loja {loja}"
            if args.simular:
                print(f"[SIMULAÇÃO] POST {api}/api/Cupons  ({rotulo})")
                print("   " + json.dumps(corpo, ensure_ascii=False))
                for img in cupom.get("imagens", []):
                    print(f"   + POST /api/Cupons/{{id}}/imagens?imagemTipoId={img['imagemTipoId']}  arquivo={img['arquivo']}")
                continue

            status, resp = requisicao("POST", f"{api}/api/Cupons", token, corpo)
            if status >= 400 or not isinstance(resp, dict) or "id" not in resp:
                print(f"ERRO  {rotulo}: HTTP {status} {str(resp)[:300]}")
                total_erro += 1
                continue
            cupom_id = resp["id"]
            print(f"OK    {rotulo}: cupom id {cupom_id}")
            total_ok += 1

            for img in cupom.get("imagens", []):
                arquivo = os.path.join(RAIZ, img["arquivo"])
                if not os.path.exists(arquivo):
                    print(f"      imagem não encontrada: {img['arquivo']}")
                    continue
                corpo_img, tipo = multipart("imagem", arquivo)
                st, r = requisicao("POST", f"{api}/api/Cupons/{cupom_id}/imagens?imagemTipoId={img['imagemTipoId']}",
                                   token, corpo_img, tipo)
                print(f"      imagem tipo {img['imagemTipoId']}: {'ok' if st < 400 else f'ERRO HTTP {st} {str(r)[:200]}'}")

    if not args.simular:
        print(f"\nConcluído: {total_ok} cupons criados, {total_erro} com erro.")


if __name__ == "__main__":
    main()

# Vegas Vantagens — Clube de Vantagens Vegas Card

Site do **Clube de Vantagens da Vegas Card**: vitrine pública dos parceiros que oferecem descontos, cupons e cashback para clientes Vegas, mais um painel administrativo para cadastrar estabelecimentos.

> Guia técnico detalhado para agentes de IA / manutenção: [CLAUDE.md](CLAUDE.md). Este README traz o contexto de negócio, o fluxo do site e os padrões de forma resumida.

---

## 1. A empresa — Vegas Card

A **Vegas Card do Brasil** é uma empresa de benefícios e meios de pagamento com sede em **Americana/SP** (R. Tamôio, 526 – Vila Santa Catarina, CEP 13466-250), com **mais de 20 anos** de mercado.

- **Soluções** (site institucional `vegascard.com.br`): PAT (Programa de Alimentação do Trabalhador), Convênios, Bônus, Mobilidade, Bem-Estar e Saúde, Entretenimento, Gestão PME e Vegas Cultural.
- **Cartões** (usados como filtro na página de categorias): Vegas Day, Vegas Plus, Vegas Alimentação, Vegas Refeição, Vegas Combustível.
- **Áreas do cliente**: Meu Cartão, Portal RH, Meu Estabelecimento, Meu Rastreador.
- **App Vegas Card**: iOS e Android — é pelo app que o cliente acompanha ofertas e notificações.
- **Atendimento**: WhatsApp 19 2108.2900 · Telefone 19 2108.2908 · atendimento@vegascard.com.br (seg–sex 8h–20h, sáb 8h–18h).
- **Números divulgados no site**: +500 mil usuários ativos e +10 mil estabelecimentos parceiros.

## 2. O produto — Clube de Vantagens

Proposta: *"Mais do que cliente, você é parte de um clube exclusivo. Cashback, descontos e vantagens únicas: só quem é Vegas tem."*

Dois públicos:

| Público | O que faz no site | Página |
|---|---|---|
| **Cliente Vegas** (portador do cartão) | Descobre parceiros, vê cupons/descontos, acha lojas no mapa e valida a oferta no caixa do estabelecimento | `index.html`, `categorias.html`, `detalhes.html`, `map.html`, landings |
| **Estabelecimento** (comércio) | Se candidata a parceiro descrevendo o benefício que dará ao cliente Vegas | `cadastro-com.html` → `enviar-parceiro.php` |

Fluxo do estabelecimento: **cadastro → análise da ficha pela Vegas → publicação da oferta no app/site**.
Fluxo do cliente: **ter o app e ser cliente ativo → receber notificações de ofertas → ir ao estabelecimento e validar no caixa**.

### Tipos de parceiro

1. **Parceiros nacionais / serviços** (landing estática, sem cupom): Farmácia (Raia/Drogasil), Totalpass, Wellhub, EWpass, MediQuo, Termas São Pedro, FGTS (Lincred — link externo), Rock Ensina, My Moment.
2. **Comércio local com cupons** (página dinâmica via API): Zanini (brinquedos), Boi que Mia (bar/restaurante), Betta Suplementos, Cãochorro (petshop), Intensos Barbearia, Mercadão dos Óculos, Vidrovan, etc.

---

## 3. Stack e arquitetura

- **HTML + CSS + JavaScript (ES modules) puros** — sem framework, sem bundler, sem build, sem testes.
- **API externa .NET** (`https://apiclubedevantagens.vegascard.com.br`) consumida via `fetch`.
- **PHP + PHPMailer** (`vendor/`) apenas para os formulários de contato.
- **Leaflet** via CDN (unpkg) para o mapa; **Font Awesome** via CDN; fonte **Rubik** (Google Fonts).

```
/                     páginas .html (home, landings, detalhes, categorias, mapa, admin, cadastros)
pages/                landings antigas (termassp, bar-restaurante)
scripts/
  env.js              window.env (API_BASE_URL, CLIENT_ID, CLIENT_SECRET) — NÃO versionado
  env.example.js      modelo do env.js
  auth.js             getClientToken() (client-credentials, cache ~1h) e loginToken()
  pages/              entrada por página: home.js, detalhes.js, login.js, admin.js
  components/         banner-slider.js, banner-slide2.js, carrossel-logos.js, map.js,
                      menumobile.js, categorias-filter.js, review-slider.js
styles/
  global.css          @import de todos os CSS (header, novidades, farmacia, totalpass…)
imgs/
  banners/<PASTA>/    banners da home em 4 tamanhos + heros das landings
  logos/              logos do carrossel e da marca
  icons/              ícones (inclusive os 4 ícones de cada landing)
enviar-user.php       formulário "Faça parte do clube"
enviar-parceiro.php   formulário "Cadastre seu comércio"
paineladmin.html      painel admin novo (módulos em scripts/pages/paineladmin/)
data/cupons.json      cupons exibidos em detalhes.html (fonte única, formato do POST /api/Cupons)
data/lojas-mapa.json  link do perfil no Google Maps por loja (botão "Consultar no mapa" e pins do mapa)
tools/                importar-cupons.py: envia data/cupons.json para a API — não vai para o servidor
mock/                 API mockada para localhost (server.py + seed.json) — nunca em produção
```

### Rodar localmente

```bash
php -S localhost:8000
```

(ou `python -m http.server` se não precisar dos formulários). `file://` não funciona por causa dos módulos ES. Copie `scripts/env.example.js` para `scripts/env.js` e preencha as credenciais.

### API mockada (somente localhost)

Para trabalhar no painel admin sem depender da API real (que bloqueia `localhost` por CORS), use o servidor mock:

```bash
python mock/server.py
```

Deixe esse terminal aberto e abra o painel por `http://localhost:8765/paineladmin.html` **ou** pelo Live Server do VS Code (ex.: `http://127.0.0.1:5501/.../paineladmin.html`). Em localhost as chamadas vão sempre para o mock na porta 8765, qualquer que seja a porta da página; o mock libera CORS só para origens localhost. Se o painel mostrar "Erro ao carregar estabelecimentos", o `mock/server.py` não está rodando.

- **Quando liga:** `scripts/auth.js` troca o `API_BASE` para `/mock-api` **apenas** quando o hostname é `localhost`, `127.0.0.1` ou `[::1]`. Em qualquer outro domínio (produção, homologação) usa a API real do `env.js`. O servidor mock também só escuta em `127.0.0.1`.
- **Dados:** `mock/seed.json` é uma cópia das **24 lojas de produção** (mesmos ids, nomes, endereços, coordenadas, categorias e imagens), mais categorias, cartões, UFs e cidades. O mock responde **no formato da API de produção**: a lista (`GET /api/Estabelecimentos`) traz só `id, nome, razaoSocial, cnpj, cidade, ativo` e o detalhe traz `imagens` como lista de URLs. Na primeira execução o seed é copiado para `mock/db.json`, que vai sendo alimentado com o que você cadastra/edita/exclui no painel. Uploads de imagem vão para `mock/uploads/`. Os cupons do mock começam vazios — para carregá-los: `python tools/importar-cupons.py --api http://127.0.0.1:8765/mock-api --token mock-token`.
- **Zerar:** apague `mock/db.json` (e `mock/uploads/`).
- `mock/db.json` e `mock/uploads/` estão no `.gitignore`. A pasta `mock/` **não deve ir para o servidor de produção**.
- Rota não implementada responde 404 e aparece no terminal como `[mock] ROTA NÃO IMPLEMENTADA`; adicione-a em `mock/server.py`.
- Sem token no `localStorage`, o mock grava `mock-token` (o painel exige um token).

---

## 4. Fluxo do site

```
index.html (home)
 ├─ Banner de cima  (.slides / banner-slider.js)   → detalhes.html#store-<id> ou landing
 ├─ Carrossel de logos (carrossel-logos.js)          → detalhes.html#store-<id>, landing ou link externo
 ├─ Busca / categorias / "Descontos e Ofertas"       → categorias.html, detalhes.html
 ├─ Banner de baixo (.slides1 / banner-slide2.js)  → landings estáticas
 └─ Header: "Sobre o Clube" (sobrenos.html) · "Faça Parte do Clube" (cadastro-usuario.html)

detalhes.html#store-<id>
 └─ detalhes.js: lê o hash (^store-(\d+)$) → getClientToken()
     → GET /api/Estabelecimentos/<id>
     → GET /api/Cupons/por-estabelecimento/<id>  (cupons com validade)

map.html          → map.js: Leaflet + /api/Estabelecimentos, /api/UnidadesFederativas, /api/Cidades/por-estado/<uf>
admin-login.html  → login.js: /api/Auth/login → token em localStorage("token")
admin.html        → admin.js: CRUD de estabelecimentos/categorias com Authorization: Bearer <token>
cadastro-*.html   → POST para enviar-*.php (rate-limit 5s por sessão, e-mail via PHPMailer)
```

Ordem obrigatória dos scripts nas páginas com API: **`scripts/env.js` (clássico) antes dos módulos**, pois os módulos leem `window.env`.

---

## 5. Padrões

### 5.1 Banners da home (contagem fixa no código!)

A home tem **dois sliders independentes**. A quantidade de slides **não é dinâmica**: ao adicionar ou remover um banner é preciso atualizar HTML, CSS e JS, senão o cálculo de posição quebra (slides estreitos, pedaço do vizinho aparecendo, autoplay pulando ou parando).

| Slider | Container | Script | Largura no CSS | IDs | Hoje |
|---|---|---|---|---|---|
| Cima | `.slides` | `scripts/components/banner-slider.js` | `styles/header.css` → `.slides { width }` | `slide1`…`slide9` | **9** |
| Baixo | `.slides1` | `scripts/components/banner-slide2.js` | `styles/novidades.css` → `.slides1 { width }` | `slide11`…`slide88` | **8** |

**Checklist para N slides:**

1. **HTML (`index.html`)**: um `<input type="radio">`, uma `<img class="slide slideX" data-base data-folder data-href>` dentro do container e um `<label class="bar bullet|bullet1" for="slideX">`.
2. **CSS**: `width` do container = **N × 100%** (9 → `900%`).
3. **JS — passo do translateX** = **100/N %**.
   - Cima: já calculado pelo array `[slide1…slideN]` em `updateSlidePosition()` — basta incluir o novo `const` no array.
   - Baixo: valor fixo em `updateSlidePosition1()` (`index * 12.5` para 8).
4. **JS — autoplay**: `currentSlide % N + 1`.
5. **JS — botões ‹ ›**: `=== N ? 1` e `=== 1 ? N`.
6. **JS — por slide**: `const slideX = document.getElementById(...)` + listener `change`.
7. **Cache busting em cascata** (ver 5.4).

Os IDs do slider de baixo são o dígito repetido (`slide11`, `slide22`… `slide88`) porque o JS monta o id com `` `slide${n}${n}` ``. Um 9º slide seria `slide99`; a partir do 10º esse esquema não funciona mais e precisa ser revisto.

**Imagens responsivas** — o `src` é montado em JS a partir de `./imgs/banners/<data-folder>/<data-base>_<TAMANHO>.<ext>`:

| Largura da tela | TAMANHO | Formato |
|---|---|---|
| ≥ 1440px | `1520X450` | widescreen |
| ≥ 1024px | `1232X365` | widescreen |
| ≥ 768px | `768X360` | paisagem |
| < 768px | `402X520` | retrato (mobile) |

- Slider de cima tenta `jpg → png → webp`; o de baixo tenta `png → jpg`.
- Nome do arquivo: **um token, MAIÚSCULO, sem espaço e sem acento** (ex.: `ROCKENSINA_1520X450.png`). `data-base` passa por `formatFileName` (espaço → `_`, remove acentos).
- O clique vem do `data-href` da `<img>` (delegação no container, sem `<a>`). Sem `data-href` o banner não é clicável (ex.: PASTEUR).

**Onde colocar cada tipo:** por convenção, lojas com cupom ficam no banner de cima e landings no de baixo — mas não é regra rígida (My Moment, landing, está no de cima).

### 5.2 Carrossel de logos

Lista **hardcoded** no array `parceiros` de `scripts/components/carrossel-logos.js`:

```js
{ link: './nome-parceiro.html' | 'detalhes.html#store-<id>' | 'https://...', src: './imgs/logos/<logo>.png', nome: '...' }
```

O array é duplicado em runtime para o scroll infinito; não há contagem a ajustar.

### 5.3 Landings de produto (páginas padronizadas)

Todas as landings de parceiro (`ewpass.html`, `totalpass.html`, `wellhub.html`, `mediquo.html`, `farmacia.html`, `rock-ensina.html`, `my-moment.html`…) têm **a mesma estrutura**; muda só **imagens, ícones, textos e links**. Para criar uma nova, copie uma existente (`ewpass.html` ou `rock-ensina.html`) e troque o conteúdo — **não crie CSS novo**, as classes já estão em `global.css`.

Estrutura (em ordem):

| Bloco | Classe | O que trocar |
|---|---|---|
| Header | `.header` | nada (idêntico em todas) |
| Hero | `.hero-prod` | 2 `<img>`: desktop e mobile (`.banner-mobile-prod`) + `data-href` |
| Chamada | `.copy-after` | título `h1.title-copy-a` + parágrafo |
| 4 vantagens | `.vantagens-prod` > 4 × `.card-vantagens-prod` | ícone (`imgs/icons/`) + texto curto |
| CTA | `.quero-conhecer` > `a.btn-conhecer` | link do parceiro |
| Prova | `.prova` | título + `.para-pattern` |
| 3 cards | `.benef-prod` > 3 × `.card-ben` | imagens `card-<parceiro>1..3` |
| Frase | `.ben-copy` | título |
| Reviews | `.reviews-prod` > `.wrapper-reviews` | 3 imagens de review |
| CTA final | `.final-prod` | título, subtítulo e link `btn-conhecer btn-white` |
| Footer | `footer` + `.down-footer` | nada |

Scripts no fim do `<body>`: `menumobile.js` + `review-slider.js`.

Assets: hero `imgs/banners/banner-<parceiro>.png` (+ mobile), `imgs/card-<parceiro>*.png`, ícones em `imgs/icons/`, reviews, logo em `imgs/logos/` e a pasta `imgs/banners/<PARCEIRO>/` com os 4 tamanhos se for entrar em um slider.

### 5.4 Cache busting

Os `?v=NN` são fixos e manuais. Ao alterar um arquivo, suba o `?v=` em **toda a cadeia** que chega até ele:

- `novidades.css` / `header.css` → `@import` em `global.css` **e** `global.css?v=` nos HTMLs.
- `banner-slider.js` / `banner-slide2.js` / `carrossel-logos.js` → `import` em `scripts/pages/home.js` **e** `home.js?v=` em `index.html`.

### 5.5 Outras convenções

- Header, footer e menu mobile são **repetidos em cada HTML** (sem template). Alterou um? Replique em todas as páginas.
- Handlers chamados por `onclick` inline são expostos em `window` (`window.fazerLogin = ...`).
- Arquivos obsoletos/duplicados: `detalhes.js` e `env.js` na raiz — use os de `scripts/`.
- Segredos: `env.js`, `scripts/env.js` e `imgs/VegasVantagens/` (build do backend) estão no `.gitignore` — nunca versionar.

---

## 6. Cupons (`data/cupons.json`)

Os cupons da página `detalhes.html` **não ficam mais escritos no HTML**: o `scripts/pages/detalhes.js` lê `data/cupons.json` e monta os cards e modais. Para criar, editar ou remover um cupom, edite só esse arquivo (e suba ele + imagens novas).

Cada item tem:

| Bloco | Para quê |
|---|---|
| `chave` | identificador do cupom no site (liga o card ao modal) |
| `lojas.estabelecimentoIds` / `lojas.nomeContem` | em quais lojas aparece: pelo id **ou** se o nome da loja contém o texto (ex.: `"pasteur"` pega as 6 unidades e futuras) |
| `post` | **exatamente o corpo de `POST /api/Cupons`** (`codigo`, `titulo`, `descricao`, `modalTitulo`, `modalDescricao`, `tipo`, `valorDesconto`, `valorMinimoCompra`, `dataInicio`, `dataExpiracao`, `limiteUso`, `limiteUsoPorUsuario`, `ativo`, `status`, `estabelecimentoId`, `cartoesAceitosIds`, `tag`). A validade exibida sai de `dataExpiracao`. |
| `cartoesAceitos` | nomes dos cartões; viram `cartoesAceitosIds` na importação |
| `imagens` | `imagemTipoId` 1 = foto do card, 2 = selo/imagem do modal (`POST /api/Cupons/{id}/imagens`) |
| `site` | só visual: `tema` (`padrao` = azul-escuro, `rosa` = Outubro Rosa, `azul` = Novembro Azul — classes `.cupom-rosa`/`.cupom-azul` no `cupom.css`), `selo`, `categoria`, ícones, `pills`, textos (`descricaoHtml` no card, `modalDescricaoHtml` no modal, `aceitos`, `avisoAlerta`, `rodape`) |

**Botão "Consultar no mapa" e pins do mapa da home** — abrem o perfil da loja no Google Maps (nova aba). O link vem, nesta ordem: do `mapaUrl` da loja na API (a API de produção ainda não devolve esse campo) → de `data/lojas-mapa.json` (chave = id da loja; link em Google Maps > Compartilhar > Copiar link) → busca pelas coordenadas da loja.

**Levar os cupons para a API** (quando ela voltar a aceitar login):

```bash
python tools/importar-cupons.py --api https://apiclubedevantagens.vegascard.com.br --simular
```
```bash
python tools/importar-cupons.py --api https://apiclubedevantagens.vegascard.com.br --email seu@email
```

O script faz login (senha pedida no terminal), um `POST /api/Cupons` por loja e envia as imagens. `--simular` só mostra o que faria; `--cupom <chave>` e `--loja <id>` limitam o envio. Teste antes no mock: `--api http://127.0.0.1:8765/mock-api --token mock-token`.

## 7. Como adicionar um parceiro (resumo)

**Landing estática** (serviço/parceiro nacional):
1. Copiar uma landing → `nome-parceiro.html` e trocar textos, ícones, imagens e links.
2. Subir assets (hero, cards, ícones, reviews, logo, banners nos 4 tamanhos).
3. Adicionar slide na home (normalmente banner de baixo) seguindo o checklist 5.1.
4. Adicionar item no array `parceiros` do carrossel.
5. Cache busting.

**Loja com cupons** (comércio local):
1. Cadastrar estabelecimento e cupons na API (via `admin.html`) e anotar o `id`.
2. Adicionar slide no banner de cima com `data-href="./detalhes.html#store-<id>"` seguindo o checklist 5.1.
3. Adicionar item no carrossel com `link: 'detalhes.html#store-<id>'`.
4. Cache busting. **Nenhum HTML novo.**

---

## 8. Pontos de atenção conhecidos

- `banner-slide2.js` registra dois `DOMContentLoaded` (carrega as imagens duas vezes) e mantém um mapa `routesByBase1` de fallback com rotas antigas.
- Destinatário dos formulários PHP ainda é placeholder (`teste@gmail.com`).
- Várias landings novas têm `TODO` com `href="#"` aguardando o link oficial do parceiro.
- O crédito do rodapé varia entre páginas ("Lymoria Studio" × "RedHot Comunicação").

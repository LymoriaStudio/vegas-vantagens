# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Site estático multi-página (pt-BR) do "Clube de Vantagens" da Vegas Card. HTML + CSS + JavaScript (ES modules) puros, sem bundler, sem framework e sem etapa de build. Os dados vêm de uma API externa (.NET) consumida via `fetch`; os formulários de contato são enviados por scripts PHP com PHPMailer.

## Executar / desenvolver

Não há `package.json`, build, linter ou testes (`scripts/testes/` está vazio).

- Para abrir o site basta servir os arquivos estáticos. As páginas JS usam `type="module"`, então `file://` não funciona — sirva por HTTP (ex.: `python -m http.server` na raiz) ou por um servidor PHP.
- Os endpoints de formulário (`enviar-user.php`, `enviar-parceiro.php`) exigem PHP. Para testar os formulários rode um servidor com PHP (ex.: `php -S localhost:8000` na raiz), que também serve os arquivos estáticos.
- Leaflet (usado em `scripts/components/map.js`) é carregado via CDN (`unpkg.com`), então o mapa precisa de internet.

## Arquitetura

**Páginas** — cada `.html` (raiz e `pages/`) é uma página independente que inclui seu próprio CSS de `styles/` e seus módulos JS. Não há layout/template compartilhado: header, footer e menu são repetidos em cada HTML.

**Camada JS** (`scripts/`):
- `scripts/env.js` (duplicado em `env.js` na raiz) define `window.env` com `API_BASE_URL`, `CLIENT_ID` e `CLIENT_SECRET`. **Precisa ser carregado como script clássico ANTES dos módulos**, pois os módulos leem `window.env`.
- `scripts/auth.js` é a base de acesso à API. `getClientToken()` faz client-credentials (`/api/Auth/client-token`) e mantém o token em memória por ~1h; `loginToken()` autentica usuário no admin. Exporta `API_BASE`, `CLIENT_ID`, `CLIENT_SECRET` lidos de `window.env`.
- `scripts/pages/` = ponto de entrada por página (`home.js`, `login.js`, `detalhes.js`, `admin.js`). `home.js` apenas importa componentes; as demais fazem `fetch` na API.
- `scripts/components/` = widgets reaproveitáveis (`banner-slider.js`, `banner-slide2.js`, `carrossel-logos.js`, `map.js`, `menumobile.js`, `categorias-filter.js`, `review-slider.js`).

**Fluxo de dados** — a página pública (`detalhes`, `index`) chama `getClientToken()` e consome endpoints como `/api/Estabelecimentos`, `/api/Cupons/por-estabelecimento/`, `/api/CategoriasEstabelecimentos`, `/api/Cidades/por-estado/`, `/api/UnidadesFederativas`. O admin (`admin.js`) autentica via `loginToken`, guarda o token em `localStorage` com a chave `"token"` e envia `Authorization: Bearer <token>` nas operações de CRUD de estabelecimentos/categorias/imagens.

**Formulários (PHP)** — `enviar-user.php` e `enviar-parceiro.php` recebem POST, aplicam rate-limit por sessão (5s) e enviam e-mail via PHPMailer (em `vendor/`). O destinatário está hardcoded como `teste@gmail.com` (placeholder a ajustar).

## Banners da home e páginas de parceiro

A home (`index.html`) tem dois elementos rotativos, e os links deles levam a **dois tipos** de destino.

**Elementos rotativos da home:**
- **Banner principal** (`scripts/components/banner-slider.js` + `banner-slide2.js`): carrossel por `<input type="radio">` (slide1…slide8), autoplay a cada 15s. Cada `<img>` tem `data-base`, `data-folder` e `data-href`. A imagem é montada de forma responsiva a partir de `./imgs/banners/<data-folder>/<data-base>_<tamanho>.<ext>`, tentando `jpg → png → webp`; o `<tamanho>` depende da largura da tela. O clique usa o `data-href` (delegação, sem `<a>`).
- **Carrossel de ícones/logos** (`scripts/components/carrossel-logos.js`): ícones rotativos com scroll infinito. A lista de parceiros é **hardcoded** no array `parceiros` (`{ link, src, nome }`), duplicada em runtime para o loop. Para incluir/remover um ícone rotativo edite esse array.

**Dois tipos de destino:**
1. **Páginas-landing estáticas** — `farmacia.html`, `ewpass.html`, `totalpass.html`, `wellhub.html`, `mediquo.html`, `fgts.html`, `termassp.html` (e `pages/termassp.html`, `pages/bar-restaurante.html`). São HTMLs independentes, de conteúdo fixo, **sem API e sem cupons**. Alguns `data-href`/links também apontam para URLs externas (ex.: Lincred/FGTS). Ligadas pelo banner e/ou pelo carrossel de logos.
2. **Lojas dinâmicas via `detalhes.html#store-<id>`** — ex.: ZANINI (`#store-3`), BOIQUEMIA (`#store-5`), BETTASUPLEMENTOS (`#store-6`), CAOCHORRO (`#store-7`), INTENSOS (`#store-28`). `detalhes.html` é **uma única página parametrizada pelo hash da URL**: `scripts/pages/detalhes.js` lê `window.location.hash`, valida com o regex `^store-(\d+)$`, busca o estabelecimento na API e seus cupons em `/api/Cupons/por-estabelecimento/<id>` (cupons com validade). Essas lojas costumam aparecer **ao mesmo tempo no banner e no carrossel de logos**, e é por terem cupons com validade que têm página própria (dinâmica), em vez de uma landing estática.

Resumindo o padrão: **landing estática** = só banner/ícone apontando para um `.html` fixo; **loja com cupons** = banner + ícone rotativo + `detalhes.html#store-<id>` servido pela API. Ao adicionar uma loja do tipo 2, basta apontar o `data-href`/`link` para `detalhes.html#store-<id>` — não se cria HTML novo.

## Como adicionar um novo parceiro

Adicionar um parceiro é sempre o **mesmo processo**: página (se for landing), banner(s) na home e logo no carrossel. O caminho muda conforme o tipo.

### Parceiro tipo landing estática (ex.: EWpass, Totalpass, Rock Ensina)

1. **Página** — copie uma landing existente (`ewpass.html` é o molde mais limpo) para `nome-parceiro.html`. Mantenha header/footer idênticos e use as mesmas classes `-prod` (`hero-prod`, `copy-after`, `vantagens-prod`, `benef-prod`, `reviews-prod`, `final-prod`): elas já vêm no `global.css` (via `farmacia.css`/`totalpass.css`), então **não crie CSS novo**. Ajuste só os textos, o `data-href` do hero, os 4 ícones, os 3 cards, os reviews e o link do parceiro. Scripts no fim: `menumobile.js` + `review-slider.js`.
2. **Assets** — em `imgs/`: hero `banner-<parceiro>.png` (+ versão mobile), cards `card-<parceiro>1..3`, ícones e reviews. Os banners do slider da home vão em `imgs/banners/<FOLDER>/<FOLDER>_<TAMANHO>.<ext>` nos 4 tamanhos `1520X450`, `1232X365`, `768X360`, `402X520`. **Convenção de nome:** um token só, maiúsculo, sem espaços e sem acento (ex.: `ROCKENSINA_1520X450.png`) — o `data-base` passa por `formatFileName` (troca espaço por `_`, remove acento), então o nome do arquivo precisa bater com isso.
3. **Home — banner de baixo** (seção `.banner-hero` / `.slides1`, controlada por `banner-slide2.js`): é onde ficam as landings. Para somar um slide:
   - No `index.html`: adicione `<input type="radio" name="slide" id="slideNN">`, a `<img class="slide slideNN" data-base="FOLDER" data-folder="FOLDER" data-href="./nome-parceiro.html">` dentro de `.slides1`, e um `<label class="bar bullet1" for="slideNN">`.
   - **Atualize a contagem de slides** (ela é fixa): no CSS `.slides1 { width }` em `novidades.css` = Nº de slides × 100% (hoje `700%` p/ 7); no `banner-slide2.js` o passo `14.2857%` (= 100/N), o `% 7` do autoplay, os `=== 7`/`=== 1` dos botões, e crie `const slideNN` com seu listener `change`.
4. **Carrossel de logos** (`scripts/components/carrossel-logos.js`): adicione um item no array `parceiros`: `{ link: './nome-parceiro.html', src: './imgs/logos/<logo>.png', nome: '...' }`.
5. **Cache busting**: incremente o `?v=` nos arquivos/refs que você alterou (ver convenções abaixo).

### Parceiro tipo loja com cupons (ex.: Zanini, Boi que Mia)

Não se cria HTML — a loja é cadastrada na API e usa `detalhes.html#store-<id>`.
- **Home — banner de cima** (seção `.slides`, controlada por `banner-slider.js`): adicione o slide com `data-href="./detalhes.html#store-<id>"`. A contagem também é fixa: CSS `.slides { width }` em `header.css` = Nº × 100% (hoje `800%`), e no `banner-slider.js` há `slideN` + listeners por slide, `% 8` no autoplay e `=== 8`/`=== 1` nos botões (o cálculo de posição já lê `slides.length`).
- **Carrossel de logos**: item no array `parceiros` com `link: 'detalhes.html#store-<id>'`.

### Regras dos banners da home (proporção e lógica de contagem)

São dois sliders independentes, cada um com sua contagem de slides **fixa no código** (não é dinâmica):

| Slider | Seção / classe | Script | CSS da largura | Qtde atual |
|--------|----------------|--------|----------------|------------|
| Banner de cima | `.banner` / `.slides` | `banner-slider.js` | `.slides { width }` em `header.css` | 8 (`slide1`–`slide8`) |
| Banner de baixo | `.banner-hero` / `.slides1` | `banner-slide2.js` | `.slides1 { width }` em `novidades.css` | 8 (`slide11`–`slide88`) |

**Proporção / tamanhos responsivos** — cada banner tem 4 arquivos, escolhidos por largura de tela (a montagem do `src` é `./imgs/banners/<data-folder>/<formatFileName(data-base)>_<TAMANHO>.<ext>`):

| Largura da tela | TAMANHO | Proporção |
|-----------------|---------|-----------|
| ≥ 1440px | `1520X450` | widescreen (~3,4:1) |
| ≥ 1024px | `1232X365` | widescreen (~3,4:1) |
| ≥ 768px | `768X360` | paisagem (~2,1:1) |
| < 768px | `402X520` | retrato mobile (~0,77:1) |

**Lógica de contagem** — ao somar/remover um slide, acerte TODOS estes pontos para N slides, senão o banner quebra:
- **CSS**: `width` do container = **N × 100%** (ex.: 8 slides → `800%`). É isso que faz cada slide ocupar exatamente a largura da janela; se esquecer, os slides ficam estreitos e aparece um pedaço do vizinho.
- **Passo**: no script, `translateX` por slide = **100/N %** (ex.: 8 → `12.5`). No `banner-slider.js` (de cima) a posição já lê `slides.length`, mas o autoplay e os botões não.
- **Autoplay**: `currentSlide % N + 1`.
- **Botões** (‹ ›): wrap em `=== N ? 1` e `=== 1 ? N`.
- **Por slide**: um `<input type="radio">`, uma `<img>`, um `<label>` bullet, e no script um `const slideXX` com seu listener `change`.

**Cache-busting em cascata** — como os `?v=` são fixos, uma mudança em arquivo importado só chega ao navegador (e à produção) se você subir o `?v=` de toda a cadeia que leva até ele. Exemplos reais:
- Mudou `novidades.css` → suba o `?v=` no `@import` dentro de `global.css` **e** o `global.css?v=` no HTML que o usa.
- Mudou `banner-slide2.js` → suba o `?v=` no `import` dentro de `home.js` **e** o `home.js?v=` no `index.html`.

## Convenções importantes

- **Cache busting por querystring**: os imports de módulos trazem `?v=NN` (ex.: `home.js?v=37`, `detalhes.js?v=68`). Ao alterar um módulo, incremente esse número nos HTMLs/imports que o referenciam, senão o browser serve a versão em cache.
- **Arquivo duplicado**: existe `detalhes.js` na raiz e em `scripts/pages/detalhes.js`. A página carrega o de `scripts/pages/`; o da raiz está obsoleto (import `'../auth.js'` sequer resolve a partir da raiz). Edite o de `scripts/pages/`.
- `env.js` também aparece duplicado (raiz e `scripts/`); o referenciado pelas páginas é `./scripts/env.js`.
- Handlers de clique/submit são expostos no escopo global (`window.fazerLogin = ...`) para serem chamados via `onclick` inline no HTML.

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

## Convenções importantes

- **Cache busting por querystring**: os imports de módulos trazem `?v=NN` (ex.: `home.js?v=37`, `detalhes.js?v=68`). Ao alterar um módulo, incremente esse número nos HTMLs/imports que o referenciam, senão o browser serve a versão em cache.
- **Arquivo duplicado**: existe `detalhes.js` na raiz e em `scripts/pages/detalhes.js`. A página carrega o de `scripts/pages/`; o da raiz está obsoleto (import `'../auth.js'` sequer resolve a partir da raiz). Edite o de `scripts/pages/`.
- `env.js` também aparece duplicado (raiz e `scripts/`); o referenciado pelas páginas é `./scripts/env.js`.
- Handlers de clique/submit são expostos no escopo global (`window.fazerLogin = ...`) para serem chamados via `onclick` inline no HTML.

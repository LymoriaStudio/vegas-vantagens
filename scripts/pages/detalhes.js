import { getClientToken, API_BASE, loginToken } from '../auth.js';


// Loader setup global
const globalLoader = document.createElement("div");
globalLoader.className = "loader";
globalLoader.style.display = "none";
document.body.appendChild(globalLoader);

function showGlobalLoader() {
  globalLoader.style.display = "block";
}
function hideGlobalLoader() {
  globalLoader.style.display = "none";
}

function createInlineLoader(targetEl) {
  const loader = document.createElement("div");
  loader.className = "loader loader-inline";
  loader.style.position = "absolute";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.zIndex = "10";
  targetEl.style.position = "relative";
  targetEl.appendChild(loader);
  return loader;
}



// Parceiros que ainda não estão na API (ex.: My Moment) ficam em data/lojas-extras.json
async function buscarLojaExtra(storeId) {
  const resp = await fetch("./data/lojas-extras.json", { cache: "no-cache" });
  if (!resp.ok) return null;
  const dados = await resp.json();
  return (dados.lojas || []).find(l => String(l.id) === String(storeId)) || null;
}

async function fetchStoreDetails(token, storeId) {
  if (/^\d+$/.test(storeId)) {
    const resp = await fetch(`${API_BASE}/api/Estabelecimentos/${storeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (resp.ok) return await resp.json();
  }
  const extra = await buscarLojaExtra(storeId);
  if (extra) return extra;
  throw new Error("Falha ao buscar estabelecimento");
}

// ---- descrições por NOME (somente) ----
const DESCRICOES_POR_NOME = [
  {
    match: ["zanini"],
    text: "A Zanini Utilidades traz praticidade e estilo para o seu lar. Com uma linha completa de produtos domésticos, a marca se destaca pela qualidade, variedade e soluções que tornam o dia a dia mais fácil e funcional."
  },
  {
    match: ["betta suplementos", "betta"],
    text: "A Betta Suplementos é referência em saúde e performance, oferecendo produtos de alta qualidade para quem busca melhor rendimento nos treinos e bem-estar no dia a dia. Comprometida com resultados reais, a marca combina excelência e confiança para ajudar você a alcançar o seu melhor."
  },
  {
    match: ["cãochorro", "caochorro", "cão chorro", "cao chorro"],
    text: "O CãoChorro é um petshop que oferece tudo o que seu melhor amigo precisa para viver feliz e saudável. Com atendimento cuidadoso, produtos de qualidade e muito carinho pelos animais, a marca é sinônimo de confiança e amor pelos pets."
  },
  {
    match: ["boi que mia"],
    text: "O Boi que Mia é uma casa de lanches que conquistou seu público com sabores únicos e ingredientes selecionados. Cada lanche é preparado com cuidado e paixão, garantindo uma experiência deliciosa e autêntica."
  },

  {
    match: ["mercadao dos oculos","Mercadão dos Óculos"],
    text: "O Mercadão dos Óculos oferece uma ampla seleção de armações, lentes e óculos de sol com excelente custo-benefício. A loja se destaca por unir qualidade, variedade e preços acessíveis, trazendo opções modernas para todos os estilos."
  },
  {
    match: ["vidrovan", "Vidrovan"],
    text: "A VIDROVAN atua desde 1996 com atendimento especializado e seis lojas interligadas, oferecendo serviços rápidos e confiáveis. Trabalha com vidros automotivos, borrachas, canaletas, máquinas de vidro, fechaduras, insul-filmes e acessórios. Seu foco é garantir qualidade e plena satisfação dos clientes."
  },

    {
    match: ["my moment", "mymoment"],
    text: "Na My Moment, cada detalhe transforma seu atendimento em uma experiência de beleza, bem-estar e autocuidado. A marca reúne serviços de cabelo, unhas, olhar, maquiagem e spa dos pés, em um espaço pensado para você desacelerar e se sentir ainda melhor."
  },
    {
    match: ["pasteur", "Pasteur"],
    text: "O Laboratório Pasteur é especializado em análises clínicas, oferecendo exames com precisão, rapidez e tecnologia avançada. Conta com profissionais qualificados e serviços como coleta domiciliar e resultados online. Seu compromisso é garantir diagnóstico confiável e cuidado contínuo com a saúde dos pacientes."
  },
];

function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

function pickDescricaoPorNome(nome = "") {
  const n = normalize(nome);
  for (const rule of DESCRICOES_POR_NOME) {
    if (rule.match.some(k => n.includes(normalize(k)))) {
      return rule.text;
    }
  }
  return "";
}


window.addEventListener("hashchange", () => window.location.reload());

document.addEventListener("DOMContentLoaded", async () => {
  const hash = decodeURIComponent(window.location.hash).slice(1);
  const idMatch = hash.match(/^store-([a-z0-9-]+)$/i);

  if (!idMatch) {
    console.warn("Formato de hash inválido:", hash);
    return;
  }

  const storeId = idMatch[1];
  showGlobalLoader();

  const imgContainers = document.querySelectorAll(".main-img, .main-img-tablet");
  const logoContainers = document.querySelectorAll(".img-logo img");
  const loadersImg = [];
  const loadersLogo = [];

  imgContainers.forEach(container => {
    const img = container.querySelector("img.img-comercio");
    if (img) {
      img.style.display = "none";
      const loader = createInlineLoader(container);
      loadersImg.push({ img, loader });
    }
  });

  logoContainers.forEach(img => {
    if (img) {
      img.style.display = "none";
      const loader = createInlineLoader(img.parentElement);
      loadersLogo.push({ img, loader });
    }
  });

  try {
    const token = await getClientToken();
    const loja = await fetchStoreDetails(token, storeId);

    if (!loja) {
      console.warn("Loja não encontrada.");
      return;
    }

    console.log(loja)

    await mostrarCuponsDoEstabelecimento(loja);

    document.querySelectorAll('.title-comercio').forEach(el => {
      el.textContent = loja.nome;
    });

    const linkMapa = await linkGoogleMapsDaLoja(loja);

    document.querySelectorAll(".coupon-modal .cm-cta").forEach(btn => {
      btn.href = linkMapa;
      btn.target = "_blank";
      btn.rel = "noopener";
    });

    const addressEl = document.querySelector(".adress");
    if (addressEl) {
      // "Rua X, 123, Bairro - Cidade" sem vírgulas sobrando quando falta algum campo
      const partes = [loja.rua, loja.numero, loja.bairro].map(v => String(v || "").trim()).filter(v => v && v !== "-");
      addressEl.textContent = partes.join(", ") + (loja.cidade ? ` - ${String(loja.cidade).trim()}` : "");
    }

    const phoneEl = document.querySelector(".phone");
    if (phoneEl) phoneEl.textContent = loja.telefone;

    const cardsEl = document.querySelector(".cards");
    if (cardsEl) cardsEl.textContent = (loja.cartoes || []).join(", ");

    // descrição específica por NOME
const avaliacaoEl = document.querySelector(".avaliacao");
if (avaliacaoEl) {
  const desc = pickDescricaoPorNome(loja.nome);
  if (desc) {
    avaliacaoEl.textContent = desc;   // seguro (sem HTML)
    avaliacaoEl.style.display = "flex";  
    console.log(desc) // garante que apareça
  } else {
    avaliacaoEl.style.display = "none";
    console.log("nao conseguiu aparecer a desc") // oculta se não houver match
  }
}


  if (loja.imagens?.length > 0) {
      loadersImg.forEach(({ img, loader }) => {
        img.onload = () => {
          img.style.display = "block";
          loader.remove();
        };
        img.onerror = () => {
          img.src = './imgs/default-image.png';
          img.style.display = "block";
          loader.remove();
        };
        // 👇 se for a loja de ID 3, usa a imagem fixa do front
    if (loja.id === 3) {
      img.src = './imgs/zanini-cupom.png';
    } else if (loja.id === 25) {
      img.src = './imgs/mercadaofach.png';
      console.log("mercadao id")
    } else {
      img.src = typeof loja.imagens[0] === 'string' ? loja.imagens[0] : loja.imagens[0]?.url;
    }
      });
    }

    if (loja.imagemPrincipal) {
      loadersLogo.forEach(({ img, loader }) => {
        img.onload = () => {
          img.style.display = "block";
          loader.remove();
        };
        img.onerror = () => {
          img.src = './imgs/default-image.png';
          img.style.display = "block";
          loader.remove();
        };
    if (loja.id === 25) {
      img.src = './imgs/logos/mercadao-logo.png';
    } else {
        img.src = loja.imagemPrincipal;
    }
      
       
      });
    }

    const tagEl = document.querySelector(".tag-comercio");
    if (tagEl && loja.categorias?.length > 0) {
      const categoria = loja.categorias[0];
      tagEl.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    } else if(loja.id == 6){
      tagEl.textContent = "Academia"
    }

  } catch (err) {
    console.error("Erro ao buscar detalhes da loja:", err.message);
  } finally {
    hideGlobalLoader();
  }
});

// ============================================================================
// CUPONS — vêm de data/cupons.json (fonte única; não ficam mais fixos no HTML)
// Cada cupom aparece na loja cujo id está em lojas.estabelecimentoIds OU cujo
// nome contém lojas.nomeContem. O bloco "post" de cada cupom é o corpo de
// POST /api/Cupons (ver tools/importar-cupons.py).
// ============================================================================
const CUPONS_URL = "./data/cupons.json";

const ICONE_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>';
const ICONE_TAG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6a3 3 0 0 1 3-3h8.5a1 1 0 0 1 .7.29l4.5 4.5a1 1 0 0 1 .3.71V15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6zM8.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>';

function esc(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function caminho(arquivo = "") {
  return /^(https?:)?\/\//.test(arquivo) ? arquivo : `./${String(arquivo).replace(/^\.?\//, "")}`;
}

function dataBR(iso) {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function imagemDoTipo(cupom, tipo) {
  return (cupom.imagens || []).find(i => i.imagemTipoId === tipo)?.arquivo || "";
}

function cupomValeParaLoja(cupom, loja) {
  const ids = cupom.lojas?.estabelecimentoIds || [];
  if (ids.some(id => String(id) === String(loja.id))) return true;
  const trecho = normalizarTexto(cupom.lojas?.nomeContem || "");
  return Boolean(trecho) && normalizarTexto(loja.nome || "").includes(trecho);
}

// "padrao" = azul-escuro original; outros temas viram a classe "cupom-<tema>" (cupom.css)
function classeTema(site = {}) {
  return site.tema && site.tema !== "padrao" ? ` cupom-${String(site.tema).replace(/[^a-z0-9-]/gi, "")}` : "";
}

function htmlCardCupom(cupom, opcoes = {}) {
  const { post, site = {} } = cupom;
  // destino definido = card da seção "Acompanhe outros Descontos": o botão leva à loja
  const botao = opcoes.destino
    ? `<button class="coupon-cta" type="button" data-href="${esc(opcoes.destino)}">Ver Oferta</button>`
    : `<button class="coupon-cta" type="button" data-target="${esc(cupom.chave)}">Ver Oferta</button>`;
  const tema = classeTema(site);
  const icone = site.iconeCategoria && site.iconeCategoria !== "pin"
    ? `<img src="${esc(caminho(site.iconeCategoria))}" alt="">`
    : ICONE_PIN;
  const pills = (site.pills || [])
    .map(p => `<span class="pill${p.alt ? " pill-alt" : ""}">${esc(p.texto)}</span>`)
    .join("") + (site.maisCartoes ? "<span>+</span>" : "");

  return `
  <article class="coupon-card${tema}" data-cupom="${esc(cupom.lojas?.nomeContem || "")}">
    <div class="coupon-media">
      <img src="${esc(caminho(imagemDoTipo(cupom, 1)))}" alt="${esc(post.titulo)}" loading="lazy">
      <span class="coupon-badge">${tema ? "" : ICONE_TAG}<strong>${esc(site.selo)}</strong></span>
    </div>
    <div class="coupon-body">
      <div class="coupon-meta">
        <span class="meta-cat">${icone}${esc(site.categoria)}</span>
        <div class="meta-pills">${pills}</div>
      </div>
      <h3 class="coupon-title">${esc(post.titulo)}</h3>
      <p class="coupon-sub">${site.descricaoHtml || esc(post.descricao)}</p>
      ${botao}
    </div>
  </article>`;
}

function htmlModalCupom(cupom) {
  const { post, site = {} } = cupom;
  const tema = classeTema(site);
  const validade = dataBR(post.dataExpiracao);
  const selo = imagemDoTipo(cupom, 2);
  const aceitos = (site.aceitos || []).map(a => a.simples
    ? `<p>${esc(a.texto)}</p>`
    : `<span class="cm-pill${a.classe ? " " + esc(a.classe) : ""}">${esc(a.texto)}</span>`).join("");
  const idTitulo = `coupon-modal-title-${esc(cupom.chave)}`;

  return `
<dialog class="coupon-modal${tema}" data-modal="${esc(cupom.chave)}" aria-labelledby="${idTitulo}">
  <button class="cm-close" aria-label="Fechar">&times;</button>
  <div class="cm-wrap">
    <div class="cm-topchips">
      <span class="cm-chip"><img src="${esc(caminho(site.iconeValidade || "imgs/calender-icon.png"))}" alt="">Válido até ${esc(validade)}</span>
      <span class="cm-chip"><img src="${esc(caminho(site.iconeCategoriaModal || "imgs/utils-icon.png"))}" alt="">${esc(site.categoriaModal || site.categoria)}</span>
    </div>
    <div class="cm-badge">${selo ? `<img src="${esc(caminho(selo))}" alt="${esc(site.selo)}" loading="lazy">` : ""}</div>
    <h2 id="${idTitulo}" class="cm-title">${esc(post.modalTitulo)}</h2>
    <p class="cm-sub">${site.modalDescricaoHtml || esc(post.modalDescricao)}</p>
    ${site.aceitosTitulo ? `<p class="aceitos-cm">${esc(site.aceitosTitulo)}</p>` : ""}
    <div class="cm-pills">${aceitos}</div>
    <div class="cm-alert">
      <div class="flex-alert"><img src="${esc(caminho(site.iconeAlerta || "imgs/alert-icon.png"))}" alt=""><strong>Atenção!</strong></div>
      ${validade ? `<p class="valid-cm">Esta oferta é válida até ${esc(validade)}</p>` : ""}
      ${site.avisoAlerta ? `<p class="subvalid-cm">${esc(site.avisoAlerta)}</p>` : ""}
    </div>
    ${site.rodape ? `<p class="cm-fineprint">${esc(site.rodape)}</p>` : ""}
    <a href="#" class="cm-cta" role="button">Consultar no mapa</a>
  </div>
</dialog>`;
}

// Link do botão "Consultar no mapa": perfil da loja no Google Maps.
// Prioridade: mapaUrl da API (quando existir) > data/lojas-mapa.json > busca pelas coordenadas.
const MAPAS_URL = "./data/lojas-mapa.json";

async function linkGoogleMapsDaLoja(loja) {
  if (loja.mapaUrl && /^https?:\/\//.test(loja.mapaUrl)) return loja.mapaUrl;
  try {
    const resp = await fetch(MAPAS_URL, { cache: "no-cache" });
    if (resp.ok) {
      const dados = await resp.json();
      const url = dados.lojas?.[String(loja.id)]?.mapaUrl;
      if (url && /^https?:\/\//.test(url)) return url;
    }
  } catch (err) {
    console.warn("Não foi possível ler", MAPAS_URL, err.message);
  }
  return `https://www.google.com/maps/search/?api=1&query=${loja.latitude},${loja.longitude}`;
}

let _cuponsPromessa = null;
function carregarCupons() {
  _cuponsPromessa ??= fetch(CUPONS_URL, { cache: "no-cache" }).then(async resp => {
    if (!resp.ok) throw new Error(`Falha ao carregar ${CUPONS_URL}: ${resp.status}`);
    const dados = await resp.json();
    return Array.isArray(dados) ? dados : dados.cupons || [];
  });
  return _cuponsPromessa;
}

function atualizarRail(grid) {
  // recalcula a barra de progresso depois de inserir cards
  grid?.dispatchEvent(new Event("scroll"));
}

// ---- "Acompanhe outros Descontos": 3 cupons de OUTRAS lojas ----
const QTD_OUTROS_CUPONS = 3;

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mostrarOutrosCupons(todos, loja) {
  const grid = document.getElementById("outros-cupons");
  if (!grid) return;
  const secao = grid.closest("section");

  // um cupom por "família" de loja (ex.: só 1 do Pasteur), sorteados a cada visita
  const porFamilia = new Map();
  embaralhar(todos.filter(c => !cupomValeParaLoja(c, loja) && c.lojas?.estabelecimentoIds?.length))
    .forEach(c => {
      const familia = normalizarTexto(c.lojas.nomeContem || c.chave);
      if (!porFamilia.has(familia)) porFamilia.set(familia, c);
    });
  const escolhidos = [...porFamilia.values()].slice(0, QTD_OUTROS_CUPONS);

  if (!escolhidos.length) {
    if (secao) secao.style.display = "none";
    return;
  }

  grid.innerHTML = escolhidos
    .map(c => htmlCardCupom(c, { destino: `./detalhes.html#store-${c.lojas.estabelecimentoIds[0]}` }))
    .join("");
  grid.querySelectorAll(".coupon-card").forEach(card => { card.style.display = "flex"; });

  if (!grid.dataset.cliqueLigado) {
    grid.dataset.cliqueLigado = "1";
    grid.addEventListener("click", e => {
      const btn = e.target.closest(".coupon-cta[data-href]");
      if (!btn) return;
      // vai para o topo antes de trocar de loja: no recarregamento o navegador
      // restaura a rolagem salva, que passa a ser o topo da página
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      window.location.href = btn.dataset.href;
    });
  }
  atualizarRail(grid);
}

async function mostrarCuponsDoEstabelecimento(estabelecimento) {
  const grid = document.querySelector(".coupon-rail .coupon-grid:not(#outros-cupons)");
  const containerModais = document.getElementById("cupons-modais") || document.body;
  let todos = [];

  try {
    todos = await carregarCupons();
  } catch (err) {
    console.error("Erro ao carregar cupons:", err.message);
  }
  const cupons = todos.filter(c => cupomValeParaLoja(c, estabelecimento));
  mostrarOutrosCupons(todos, estabelecimento);

  if (grid) {
    grid.innerHTML = cupons.map(htmlCardCupom).join("");
    // .coupon-card nasce com display:none no cupom.css; os cupons da loja são ligados aqui
    grid.querySelectorAll(".coupon-card").forEach(card => { card.style.display = "flex"; });
  }
  containerModais.querySelectorAll("dialog.coupon-modal").forEach(m => m.remove());
  containerModais.insertAdjacentHTML("beforeend", cupons.map(htmlModalCupom).join(""));
  vincularModaisCupons();
  atualizarRail(grid);

  const encontrouAlgum = cupons.length > 0;
  const containerCupons = document.querySelector(".coupons-section");

  // cria/pega a mensagem de "sem cupons"
  let msg = document.getElementById("no-coupons-msg");
  if (!msg) {
    msg = document.createElement("p");
    msg.id = "no-coupons-msg";
    msg.className = "no-coupons-msg";
    msg.textContent = "No momento não há cupons disponíveis para este estabelecimento.";
    msg.setAttribute("aria-live", "polite");
    if (grid && grid.parentElement) grid.parentElement.insertBefore(msg, grid.nextSibling);
    else (containerCupons || document.body).appendChild(msg);
  }

  if (containerCupons) containerCupons.style.display = "block"; // mantém a seção para mostrar a msg
  msg.style.display = encontrouAlgum ? "none" : "block";

  return encontrouAlgum;
}

/*

function mostrarCuponsDoEstabelecimento(estabelecimento) {
  const nomeEstabelecimento = normalizarTexto(estabelecimento?.nome || '');

  const todosCupons = document.querySelectorAll('article.coupon-card');

  let encontrouAlgum = false; // <-- FALTAVA ISTO

  todosCupons.forEach(cupom => {
    const nomeCupom = normalizarTexto(cupom.dataset.cupom || '');
    const corresponde = nomeCupom && nomeEstabelecimento.includes(nomeCupom);

    cupom.style.display = corresponde ? 'flex' : 'none';
    if (corresponde) encontrouAlgum = true;

    console.log('cupom:', nomeCupom, '| corresponde:', corresponde, '| loja:', nomeEstabelecimento);
  });

  // (opcional) esconder/mostrar o bloco de cupons
  const containerCupons = document.querySelector('.coupons-section');
  if (containerCupons) {
    containerCupons.style.display = encontrouAlgum ? 'block' : 'none';
  }
}
*/

// Função utilitária
function normalizarTexto(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}



/*
async function fetchCuponsPorEstabelecimento(token, estabelecimentoId) {
  const resp = await fetch(`https://apiclubedevantagens.vegascard.com.br/api/Cupons/por-estabelecimento/${estabelecimentoId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!resp.ok) throw new Error("Falha ao buscar cupons");
  return await resp.json();
}

if (window.location.pathname.includes("detalhes.html")) {
  document.addEventListener("DOMContentLoaded", async () => {
    const hash = decodeURIComponent(window.location.hash).slice(1);
    const idMatch = hash.match(/^store-(\d+)$/);
    if (!idMatch) return;
    const storeId = idMatch[1];

    const container = document.querySelector(".coupon-grid");
    if (!container) return;

    const loaderCupons = document.createElement("div");
    loaderCupons.className = "loader";
    loaderCupons.style.display = "none";
    container.parentElement.insertBefore(loaderCupons, container);

    loaderCupons.style.display = "block";

    try {
      const token = await getClientToken();
      const cupons = await fetchCuponsPorEstabelecimento(token, storeId);

      const semCupom = document.querySelector(".sem-cupom")
      container.innerHTML = "";

      if(cupons.length === 0) {
           semCupom.style.display = 'flex'
      } else {
 cupons.forEach(cupom => {
        const card = document.createElement("div");
        card.className = "coupon-card";
        card.innerHTML = `
  <div class="coupon-image">
    <img src="${cupom.imagens?.[0] || './imgs/img-desc.png'}" alt="Imagem do Cupom">
  </div>
  <div class="coupon-content">
    <div class="coupon-tag">${cupom.tipo === "Percentual" ? `${cupom.valorDesconto}% OFF` : 'Desconto'}</div>
    <h2 class="coupon-title">${cupom.titulo}</h2>
    <p class="coupon-description">${cupom.descricao}</p>
    <button class="coupon-button">Ver Mais</button>
  </div>
`;

        card.querySelector("button").addEventListener("click", () => {
          console.log('clicou!');
          
          const modal = document.querySelector(".modal");
          const overlay = document.querySelector(".modal-overlay");
          if (!modal || !overlay) return;

          modal.querySelector(".modal-title").textContent = cupom.titulo;
          modal.querySelector(".modal-validade").textContent = `Válido até ${new Date(cupom.dataExpiracao).toLocaleDateString()}`;
          modal.querySelector(".modal-descricao").textContent = cupom.descricao;
          modal.querySelector(".modal-logo").src = cupom.imagens?.[0] || "";

          modal.style.display = "flex";
          modal.style.flexDirection = 'column'
          modal.style.alignItems = 'center'
          overlay.style.display = "flex";
        });

        container.appendChild(card);
      });

      const closeBtn = document.querySelector(".modal .close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          document.querySelector(".modal").style.display = "none";
          document.querySelector('.modal-overlay').style.display = 'none'
        });
      }
      }

     

    } catch (e) {
      console.error("Erro ao carregar cupons:", e.message);
    } finally {
      loaderCupons.style.display = "none";
    }
  });
}
 */


// Abre um único modal global ao clicar em qualquer .coupon-cta
// pega todos os botões e liga cada um ao seu modal correspondente
// Overlay ultra-robusto (inline styles, ignorando CSS externo)
function ensureOverlay() {
  let ov = document.getElementById('__coupon_overlay__');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '__coupon_overlay__';
    // estilos inline para não sofrer override
    Object.assign(ov.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(17,20,40,.55)',
      backdropFilter: 'blur(2px)',
      zIndex: '9998',        // bem acima de qualquer coisa
      opacity: '0',
      pointerEvents: 'none',
      transition: 'opacity .15s ease',
    });
    ov.addEventListener('click', () => {
      // fecha qualquer modal aberto ao clicar no overlay
      document.querySelectorAll('.coupon-modal').forEach(m => m.style.display = 'none');
      hideOverlay();
      document.body.style.overflow = '';
    });
    document.body.appendChild(ov);
  }
  return ov;
}

function showOverlay() {
  const ov = ensureOverlay();
  ov.style.opacity = '1';
  ov.style.pointerEvents = 'auto';
}

function hideOverlay() {
  const ov = ensureOverlay();
  ov.style.opacity = '0';
  ov.style.pointerEvents = 'none';
}

// ===== Integra com seus botões/modais (chamado depois de montar os cupons) =====
function vincularModaisCupons() {
document.querySelectorAll('.coupon-card .coupon-cta').forEach(btn => {
  const key = btn.dataset.target;
  const modal = document.querySelector(`.coupon-modal[data-modal="${key}"]`);
  if (!key || !modal) return;

  btn.addEventListener('click', () => {
    modal.style.display = 'block'; // seu modo simples
    showOverlay();                 // <- liga o overlay
    document.body.style.overflow = 'hidden';
    // z-index do modal maior que o overlay
    modal.style.zIndex = '2147483647';
  });

  const closeBtn = modal.querySelector('.cm-close');
  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      hideOverlay();               // <- desliga o overlay
      document.body.style.overflow = '';
    });
    closeBtn.dataset.bound = '1';
  }

  // fechar clicando “fora” (no próprio dialog, se usar <dialog>)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      hideOverlay();
      document.body.style.overflow = '';
    }
  });
});
}


 

(() => {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const initRail = (rail) => {
    if (!rail || rail.dataset.csReady === "1") return;
    rail.dataset.csReady = "1";

    const track = rail.querySelector('.coupon-grid');
    const bar   = rail.querySelector('.cs-progress');
    const thumb = bar ? bar.querySelector('.cs-thumb') : null;
    if (!track) return;

    // setas ‹ › ao lado do título da seção (só aparecem quando há rolagem)
    const setas = rail.closest('section')?.querySelector('.cupons-setas');
    const setaAnterior = setas?.querySelector('[data-direcao="-1"]');
    const setaProxima  = setas?.querySelector('[data-direcao="1"]');
    const passoCard = () => {
      const card = track.querySelector('.coupon-card:not([style*="display: none"])');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };
    setas?.querySelectorAll('.seta-cupons').forEach(btn => {
      btn.addEventListener('click', () => {
        track.scrollBy({ left: Number(btn.dataset.direcao) * passoCard(), behavior: 'smooth' });
        // recalcula o estado das setas mesmo que o navegador demore a disparar "scroll"
        setTimeout(updateBar, 450);
      });
    });

    const updateBar = () => {
      // cursor de "arrastar" e setas só quando há conteúdo além da largura da faixa
      const temScroll = track.scrollWidth > track.clientWidth + 1;
      track.classList.toggle('com-scroll', temScroll);
      if (setas) {
        setas.hidden = !temScroll;
        const max = track.scrollWidth - track.clientWidth;
        if (setaAnterior) setaAnterior.disabled = track.scrollLeft <= 1;
        if (setaProxima)  setaProxima.disabled  = track.scrollLeft >= max - 1;
      }
      if (!bar || !thumb) return;

      const maxScroll = track.scrollWidth - track.clientWidth;
      const ratio     = track.clientWidth / Math.max(track.scrollWidth, 1);
      const thumbPct  = Math.max(ratio * 100, 8); // largura mínima 8%
      const leftPct   = maxScroll > 0
        ? (track.scrollLeft / maxScroll) * (100 - thumbPct)
        : 0;

      thumb.style.width = thumbPct + '%';
      thumb.style.left  = leftPct + '%';
      bar.setAttribute('aria-valuenow',
        String(Math.round((track.scrollLeft / (maxScroll || 1)) * 100))
      );

      // esconde barra quando não há overflow
      bar.hidden = track.scrollWidth <= track.clientWidth + 1;
    };

    // sincroniza barra enquanto rola
    track.addEventListener('scroll', updateBar, { passive: true });

    // wheel vertical -> horizontal (só se houver overflow)
    track.addEventListener('wheel', (e) => {
      if (track.scrollWidth <= track.clientWidth) return; // deixa a página rolar
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        track.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // teclado ← →
    track.tabIndex = 0;
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        track.scrollBy({ left: track.clientWidth * 0.6, behavior: 'smooth' });
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        track.scrollBy({ left: -track.clientWidth * 0.6, behavior: 'smooth' });
      }
    });

    // clique/arraste na barra para navegar
    if (bar && thumb) {
      let dragging = false, pointerId = null;

      const moveToClientX = (clientX) => {
        const rect = bar.getBoundingClientRect();
        const x = clamp(clientX - rect.left, 0, rect.width);
        const p = rect.width ? (x / rect.width) : 0;
        const maxScroll = track.scrollWidth - track.clientWidth;
        track.scrollLeft = maxScroll * p;
      };

      bar.addEventListener('pointerdown', (e) => {
        dragging = true; pointerId = e.pointerId; bar.classList.add('dragging');
        bar.setPointerCapture(pointerId);
        moveToClientX(e.clientX);
      });
      bar.addEventListener('pointermove', (e) => {
        if (dragging) moveToClientX(e.clientX);
      });
      const stop = () => {
        if (!dragging) return;
        dragging = false; bar.classList.remove('dragging');
        try { bar.releasePointerCapture(pointerId); } catch {}
        pointerId = null;
      };
      bar.addEventListener('pointerup', stop);
      bar.addEventListener('pointercancel', stop);
    }

    // arrastar com o mouse (clicar e puxar para os lados)
    // < 5px = clique normal; acima disso vira arraste e o clique é cancelado
    let arrastando = false, moveu = false, inicioX = 0, inicioScroll = 0;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (track.scrollWidth <= track.clientWidth) return;
      arrastando = true; moveu = false;
      inicioX = e.clientX; inicioScroll = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!arrastando) return;
      const dx = e.clientX - inicioX;
      if (!moveu && Math.abs(dx) > 5) {
        moveu = true;
        track.classList.add('arrastando');   // desliga o scroll-snap durante o arraste
      }
      if (moveu) track.scrollLeft = inicioScroll - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!arrastando) return;
      arrastando = false;
      if (moveu) {
        track.classList.remove('arrastando');
        setTimeout(() => { moveu = false; }, 0);  // o "click" do soltar ainda vê moveu = true
      }
    });
    track.addEventListener('click', (e) => {
      if (moveu) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    track.addEventListener('dragstart', (e) => e.preventDefault());  // não arrastar a imagem

    // recalcular em mudanças de tamanho
    const ro = new ResizeObserver(updateBar);
    ro.observe(track);
    window.addEventListener('resize', updateBar);

    // inicial
    updateBar();
  };

  // inicializa TODOS os rails da página
  document.querySelectorAll('.coupon-rail').forEach(initRail);

  // (opcional) se você injeta sections depois do load, exponha a função:
  window.initCouponRail = initRail;
})();







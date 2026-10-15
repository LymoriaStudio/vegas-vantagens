// map-leaflet.js — ajustes: (1) load inicial em "Americana" + (2) Ver Mais mobile
import { getClientToken, loginToken } from '../auth.js';

let map;
let markers = [];
let markersGroup = null;

let LOJAS_CACHE = [];
let ESTADO_ATUAL = "";

function corrigirCoordenada(valor, tipo) {
  const num = parseFloat(valor);
  if (isNaN(num)) return NaN;
  if (tipo === "longitude" && (num > 180 || num < -180)) return num / 1e15;
  if (tipo === "latitude"  && (num > 90  || num < -90 )) return num / 1e15;
  return num;
}

// ---------------- API ----------------
async function fetchAllStores(accessToken) {
  try {
    const respLista = await fetch('https://apiclubedevantagens.vegascard.com.br/api/Estabelecimentos', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!respLista.ok) throw new Error("Erro ao buscar lista geral");
    const lista = await respLista.json();

    const detalhes = await Promise.all(
      lista.map(async loja => {
        const detalheResp = await fetch(`https://apiclubedevantagens.vegascard.com.br/api/Estabelecimentos/${loja.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!detalheResp.ok) return null;
        return await detalheResp.json();
      })
    );

    const completos = detalhes.filter(e => e && e.latitude && e.longitude);
    completos.forEach(l => {
      l._lat = corrigirCoordenada(l.latitude, "latitude");
      l._lng = corrigirCoordenada(l.longitude, "longitude");
    });
    return completos.filter(l => !isNaN(l._lat) && !isNaN(l._lng));
  } catch (err) {
    console.error("Erro ao buscar estabelecimentos completos:", err.message);
    return [];
  }
}

async function fetchStoreDetails(loginToken, storeId) {
  const resp = await fetch(`https://apiclubedevantagens.vegascard.com.br/api/Estabelecimentos/${storeId}`, {
    headers: { 'Authorization': `Bearer ${loginToken}` }
  });
  return resp.json();
}

// ---------------- DOM refs ----------------
const filterState   = document.getElementById("filterState");
const filterCity    = document.getElementById("filterCity");
const filterSegment = document.getElementById("filterSegment");
const searchInput   = document.getElementById("searchInput");
const btnLimpar     = document.querySelector(".limpar");
const lojasList     = document.querySelector(".produtoLista");
const resultsCount  = document.querySelector(".resultscount span");
const buttonVerMais = document.querySelector(".vermais");
const lojasContainer= document.querySelector(".lojas");
const resultsFilter = document.querySelector(".filter-results");

// loader + mensagens
const loader = document.createElement("div");
loader.className = "loader";
loader.style.display = "none";
lojasList.parentElement.insertBefore(loader, lojasList);

function mostrarLoader(){ const msg = document.getElementById("mensagem-vazia"); if(msg) msg.style.display="none"; loader.style.display="block"; }
function esconderLoader(){ loader.style.display="none"; }
function mostrarMensagemVazia(){ const msg = document.getElementById("mensagem-vazia"); if(msg) msg.style.display="block"; }
function esconderMensagemVazia(){ const msg = document.getElementById("mensagem-vazia"); if(msg) msg.style.display="none"; }

// ---------------- Estados/Cidades ----------------
async function carregarEstados() {
  try {
    const accessToken = await getClientToken();
    const resp = await fetch("https://apiclubedevantagens.vegascard.com.br/api/UnidadesFederativas", {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const estados = await resp.json();

    filterState.innerHTML = '<option value="">Todos os Estados</option>';
    const listEstados = document.querySelector(".custom-options[data-input-id='filterState']");
    if (listEstados) listEstados.innerHTML = '<li data-value="">Todos os Estados</li>';

    estados.forEach(estado => {
      const opt = document.createElement("option");
      opt.value = estado.id;
      opt.textContent = estado.sigla;
      filterState.appendChild(opt);

      const li = document.createElement("li");
      li.dataset.value = estado.id;
      li.textContent = estado.sigla;
      listEstados.appendChild(li);

      li.addEventListener("click", async () => {
        filterState.value = estado.id;
        document.querySelector(".custom-select-title").textContent = estado.sigla;
        listEstados.querySelectorAll("li").forEach(el => el.classList.remove("selected"));
        li.classList.add("selected");
        ESTADO_ATUAL = estado.id;
        await atualizarCidadesPorEstado(estado.id);
      });
    });

    const sp = estados.find(e => e.sigla.toLowerCase() === "sp");
    if (sp) {
      filterState.value = sp.id;
      const title = document.querySelector(".custom-select-title");
      if (title) title.textContent = sp.sigla;
      ESTADO_ATUAL = sp.id;
      await atualizarCidadesPorEstado(sp.id);
    }
  } catch (err) {
    console.error("Erro ao carregar estados:", err);
  }
}

// segmentos → das lojas
function carregarSegmentosDasLojas(lojas) {
  const segSet = new Set();
  lojas.forEach(l => (l.categorias || []).forEach(c => segSet.add(c)));

  filterSegment.innerHTML = '<option value="">Todos os Segmentos</option>';
  const listSeg = document.querySelector(".custom-options[data-input-id='filterSegment']");
  if (listSeg) listSeg.innerHTML = '<li data-value="">Todos os Segmentos</li>';

  // >>> handler do "Todos os Segmentos" no MOBILE
const liTodosSeg = listSeg?.querySelector('li[data-value=""]');
if (liTodosSeg) {
  liTodosSeg.addEventListener('click', () => {
    // limpa seleção visual
    listSeg.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
    liTodosSeg.classList.add('selected');

    // atualiza o select oculto + título
    filterSegment.value = "";
    const title = listSeg.closest(".custom-select")?.querySelector(".custom-select-title");
    if (title) title.textContent = "Todos os Segmentos";

    // dispara mudança para refazer os marcadores/cards
    filterSegment.dispatchEvent(new Event("change"));
  });
}


  [...segSet].sort((a,b)=> a.localeCompare(b)).forEach(seg => {
    const opt = document.createElement("option");
    opt.value = seg;
    opt.textContent = seg;
    filterSegment.appendChild(opt);

    if (listSeg) {
      const li = document.createElement("li");
      li.dataset.value = seg;
      li.textContent = seg;
      listSeg.appendChild(li);
      li.addEventListener("click", () => {
        filterSegment.value = seg;
        const title = listSeg.closest(".custom-select")?.querySelector(".custom-select-title");
        if (title) title.textContent = seg;
        filterSegment.dispatchEvent(new Event("change"));
        listSeg.querySelectorAll("li").forEach(el => el.classList.remove("selected"));
        li.classList.add("selected");
      });
    }
  });
}

// cidades que realmente têm lojas válidas
function cidadesComLojas(lojas) {
  const set = new Set();
  lojas.forEach(l => {
    if (l.cidade && !isNaN(l._lat) && !isNaN(l._lng)) set.add(l.cidade);
  });
  return [...set];
}

async function atualizarCidadesPorEstado(estadoId) {
  if (!estadoId) return;
  ESTADO_ATUAL = estadoId;
  const listaUl = document.getElementById("list-ul");
  filterCity.innerHTML = `<option value="">Todas as Cidades</option>`;
  listaUl.innerHTML = `<li data-value="">Todas as Cidades</li>`;

  // >>> handler do "Todas as Cidades" no MOBILE
const liTodasCidades = listaUl.querySelector('li[data-value=""]');
if (liTodasCidades) {
  liTodasCidades.addEventListener('click', () => {
    // limpa seleção visual dos outros
    listaUl.querySelectorAll('li').forEach(el => {
      el.classList.remove('active');
      el.classList.remove('selected');
    });
    // aplica seleção no item "Todas as Cidades"
    liTodasCidades.classList.add('active');
    liTodasCidades.classList.add('selected');

    // atualiza o select oculto + título
    filterCity.value = "";
    const title = listaUl.closest(".custom-select")?.querySelector(".custom-select-title");
    if (title) title.textContent = "Todas as Cidades";

    // dispara o filtro
    filterCity.dispatchEvent(new Event("change"));
  });
}


  try {
    const accessToken = await getClientToken();

    if (LOJAS_CACHE.length === 0) LOJAS_CACHE = await fetchAllStores(accessToken);

    // cidades no estado (API) — e cruzamos com as que têm lojas
    const resp = await fetch(`https://apiclubedevantagens.vegascard.com.br/api/Cidades/por-estado/${estadoId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resp.ok) throw new Error("Cidades não encontradas para este estado.");
    const cidadesAPI = await resp.json();

    const setLojas = new Set(cidadesComLojas(LOJAS_CACHE).map(c => c.toLowerCase()));
    const cidadesFiltradas = cidadesAPI
      .map(c => c.nome)
      .filter(nome => setLojas.has((nome || "").toLowerCase()))
      .sort((a,b)=>a.localeCompare(b));

    cidadesFiltradas.forEach(nome => {
      const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);

      const opt = document.createElement("option");
      opt.value = nome;
      opt.textContent = nomeFormatado;
      filterCity.appendChild(opt);

      const li = document.createElement("li");
      li.textContent = nomeFormatado;
      li.dataset.value = nome;
      li.addEventListener("click", () => {
        filterCity.value = nome;
        filterCity.dispatchEvent(new Event("change"));
        listaUl.querySelectorAll("li").forEach(el => { el.classList.remove("active"); el.classList.remove("selected"); });
        li.classList.add("active"); li.classList.add("selected");
        const title = listaUl.closest(".custom-select")?.querySelector(".custom-select-title");
        if (title) title.textContent = nomeFormatado;
      });
      listaUl.appendChild(li);
    });

    carregarSegmentosDasLojas(LOJAS_CACHE);
  } catch (error) {
    console.warn("Falha ao carregar cidades:", error.message);
    limparMarcadores();
    lojasList.innerHTML = "";
  }

  filtrar();
}

// ---------------- Leaflet helpers ----------------
function criarMapaSeNecessario(center=[-23.561684, -46.625378], zoom=10) {
  if (map) return;
  map = L.map('map', { scrollWheelZoom: true }).setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  markersGroup = L.featureGroup().addTo(map);
}

function limparMarcadores() { if (markersGroup) markersGroup.clearLayers(); markers = []; }

function adicionarMarcador(loja) {
  const lat = loja._lat ?? corrigirCoordenada(loja.latitude, "latitude");
  const lng = loja._lng ?? corrigirCoordenada(loja.longitude, "longitude");
  if (isNaN(lat) || isNaN(lng)) return null;

  // URLs do Google Maps
  const gmapView = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const gmapDir  = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

 const marker = L.marker([lat, lng]).addTo(markersGroup)
  .bindPopup(`
    <b>${loja.nome}</b><br>
    ${loja.rua || ""}, ${loja.numero || ""}, ${loja.bairro || ""}<br>
    <i>${(loja.categorias || []).join(", ")}</i><br>
    <a href="${gmapView}" target="_blank" rel="noopener">Ver no Google Maps</a>
    &nbsp;•&nbsp;
    <a href="${gmapDir}" target="_blank" rel="noopener">Traçar rota</a>
  `)
  .bindTooltip(loja.nome, {
    permanent: true,      // <- sempre visível
    direction: 'top',     // acima do marker
    offset: [0, -15],     // ajuste fino (suba/abaixe conforme seu ícone)
    opacity: 1,
    className: 'marker-label' // classe pra CSS
  });


  // 👉 Se quiser que ao clicar no marker já abra o Google Maps (sem popup),
  //    descomente as duas linhas abaixo.
 marker.off('click'); // remove algum click antigo (ex.: ir para detalhes)
 marker.on('click', () => window.open(gmapView, '_blank', 'noopener'));

  markers.push(marker);
  return marker;
}


function centralizarNoConjunto() {
  if (!markersGroup) return;
  const bounds = markersGroup.getBounds();
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
}

// ---------------- List + Mapa ----------------
async function updateMapaLista({ cidade="", segmento="", busca="" }) {
  try {
    mostrarLoader();
    const accessToken = await getClientToken();
    if (LOJAS_CACHE.length === 0) LOJAS_CACHE = await fetchAllStores(accessToken);

    criarMapaSeNecessario();
    limparMarcadores();
    lojasList.innerHTML = "";
    esconderMensagemVazia();

    const lojasFiltradas = LOJAS_CACHE.filter(loja => {
      const nomeMatch   = !busca    || (loja.nome || "").toLowerCase().includes(busca.toLowerCase());
      const cidadeMatch = !cidade   || (loja.cidade || "").toLowerCase() === cidade.toLowerCase();
      const segMatch    = !segmento || (loja.categorias || []).some(cat => (cat || "").toLowerCase().includes(segmento.toLowerCase()));
      return nomeMatch && cidadeMatch && segMatch;
    });

    if (lojasFiltradas.length === 0) {
      mostrarMensagemVazia();
      resultsCount.textContent = "0";
      aplicarPaginacaoMobile(); // garante estado do botão
      return;
    }

    lojasFiltradas.forEach(loja => {
      adicionarMarcador(loja);

      const li = document.createElement("li");
      li.classList.add("place-card");
      li.dataset.city  = loja.cidade || "";
      li.dataset.state = "";
      li.dataset.seg   = (loja.categorias || []).join(",") || "";
      li.dataset.card  = (loja.cartoes || []).join(",") || "";
      li.dataset.tags  = `${(loja.nome||"").toLowerCase()} ${(loja.rua||"").toLowerCase()}`;

      let imagemLoja;
      if (loja.id === 3) {
    imagemLoja = './imgs/zanini-cupom.png'; // caminho da imagem fixa
    } else {
    imagemLoja = (loja.imagens && loja.imagens[0]) || './imgs/default-image.png';
    }

      li.innerHTML = `
        <div class="place-image">
          <img src="${imagemLoja}" alt="${loja.nome}"
               onerror="this.onerror=null;this.src='./imgs/default-image.png';">
        </div>
        <div class="place-details">
          <h3>${loja.nome}</h3>
          <p class="address">${loja.rua || ""}, ${loja.numero || ""}, ${loja.bairro || ""}</p>
          <p class="distance"><img src="./imgs/icons/location.svg" /> 5.0 km</p>
          <button class="btn-card-map">Saiba Mais</button>
        </div>
      `;
      li.addEventListener("click", () => {
        const hash = encodeURIComponent(`store-${loja.id}`);
        window.location.href = `detalhes.html#${hash}`;
      });

      lojasList.appendChild(li);
    });

    resultsCount.textContent = `${lojasFiltradas.length}`;
    centralizarNoConjunto();

    // >>> aplica regra do mobile (3 itens + "ver mais")
    aplicarPaginacaoMobile();

  } catch (err) {
    console.error("Erro ao atualizar mapa:", err.message);
    mostrarMensagemVazia();
  } finally {
    esconderLoader();
  }
}

// ---------------- Filtro principal ----------------
function filtrar() {
  const search   = (searchInput.value || "").toLowerCase();
  const cidade   = filterCity.value;     // "" = todas
  const segmento = filterSegment.value;  // "" = todos
  updateMapaLista({ cidade, segmento, busca: search });
}

// ---------------- Ver Mais (MOBILE) ----------------
function aplicarPaginacaoMobile() {
  const items = document.querySelectorAll(".place-card");
  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    // desktop: sempre mostra tudo e esconde botão
    items.forEach(it => it.classList.remove("hidden"));
    buttonVerMais.style.display = "none";
    buttonVerMais.classList.remove("expanded");
    buttonVerMais.textContent = "Ver Mais";
    return;
  }

  // mobile
  if (items.length <= 3) {
    items.forEach(it => it.classList.remove("hidden"));
    buttonVerMais.style.display = "none";
    buttonVerMais.classList.remove("expanded");
    buttonVerMais.textContent = "Ver Mais";
    return;
  }

  const expanded = buttonVerMais.classList.contains("expanded");
  items.forEach((it, idx) => {
    it.classList.toggle("hidden", !expanded && idx >= 3);
  });

  buttonVerMais.style.display = "block";
  buttonVerMais.textContent = expanded ? "Ver Menos" : "Ver Mais";
}

buttonVerMais.addEventListener("click", () => {
  buttonVerMais.classList.toggle("expanded");
  aplicarPaginacaoMobile();
});

window.addEventListener("resize", aplicarPaginacaoMobile);

// ---------------- Limpar ----------------
function limparDados() {
  // mantém estado atual
  filterCity.innerHTML = '<option value="">Todas as Cidades</option>';
  const listUl = document.getElementById("list-ul");
  if (listUl) listUl.innerHTML = '<li data-value="">Todas as Cidades</li>';
  filterSegment.value = "";
  searchInput.value = "";

  lojasList.innerHTML = "";
  limparMarcadores();

  criarMapaSeNecessario();
  map.setView([-23.561684, -46.625378], 10);

  atualizarCidadesPorEstado(filterState.value);
  // exibe todas após limpar
  updateMapaLista({ cidade:"", segmento:"", busca:"" });
}

// ---------------- Custom selects (mobile) ----------------
document.querySelectorAll(".custom-select").forEach((selectWrapper) => {
  const title = selectWrapper.querySelector(".custom-select-title");
  const optionsList = selectWrapper.querySelector(".custom-options");
  const hiddenInput = document.getElementById(optionsList?.dataset?.inputId);
  if (!title || !optionsList || !hiddenInput) return;

  title.addEventListener("click", () => {
    optionsList.classList.toggle("show-options");
  });

  optionsList.querySelectorAll("li").forEach((option) => {
    option.addEventListener("click", async () => {
      const value = option.getAttribute("data-value");
      optionsList.querySelectorAll("li").forEach((li) => li.classList.remove("selected"));
      option.classList.add("selected");

      hiddenInput.value = value;
      title.textContent = option.textContent;
      optionsList.classList.remove("show-options");

      if (hiddenInput.id === "filterState") {
        await atualizarCidadesPorEstado((value || "").toLowerCase());
      } else {
        hiddenInput.dispatchEvent(new Event("change"));
      }
    });
  });

  document.addEventListener("click", (e) => {
    if (!selectWrapper.contains(e.target)) optionsList.classList.remove("show-options");
  });
});

const btnCloseFilter = document.querySelector(".close-filter");
const mobileFilter   = document.querySelector(".mobile-btns");
const btnFilter      = document.querySelector(".mobile-filter");
const overlay        = document.querySelector(".overlay");

btnCloseFilter.addEventListener("click", () => {
  mobileFilter.classList.remove("active");
  overlay.classList.remove("active");
  document.body.classList.remove("no-scroll");
});
btnFilter.addEventListener('click', () => {
  mobileFilter.classList.add("active");
  overlay.classList.add("active");
  document.body.classList.add('no-scroll');
});

document.querySelectorAll('.custom-options').forEach(optionList => {
  const selectId = optionList.dataset.inputId;
  const select = document.getElementById(selectId);
  optionList.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const value = li.dataset.value;
      select.value = value;
      optionList.querySelectorAll('li').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
      select.dispatchEvent(new Event('change'));
    });
  });
});

// ---------------- Eventos principais ----------------
filterCity.addEventListener("change", filtrar);
filterSegment.addEventListener("change", filtrar);
searchInput.addEventListener("input", filtrar);
btnLimpar.addEventListener("click", limparDados);

// ---------------- Boot ----------------
async function initMap() {
  try {
    criarMapaSeNecessario();

    const accessToken = await getClientToken();
    if (LOJAS_CACHE.length === 0) LOJAS_CACHE = await fetchAllStores(accessToken);

    if (!LOJAS_CACHE || LOJAS_CACHE.length === 0) {
      console.warn("Nenhuma loja encontrada.");
      return;
    }

    // Não renderiza todos aqui (para não sobrescrever o filtro inicial).
    // Apenas posiciona em um centro inicial "suave".
    const primeira = LOJAS_CACHE[0];
    map.setView([primeira._lat, primeira._lng], 13);

    // popula segmentos (uma vez)
    carregarSegmentosDasLojas(LOJAS_CACHE);
  } catch (error) {
    console.error("Erro ao inicializar o mapa:", error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await carregarEstados();

  // Define SP e a cidade "Americana" como padrão VISUAL + FILTRO REAL
  const spOption = [...filterState.options].find(opt => opt.textContent === "SP");
  if (spOption) {
    filterState.value = spOption.value;
    const estadoLi = document.querySelector(`.custom-options[data-input-id='filterState'] li[data-value='${spOption.value}']`);
    if (estadoLi) {
      estadoLi.classList.add("selected");
      const title = estadoLi.closest(".custom-select")?.querySelector(".custom-select-title");
      if (title) title.textContent = estadoLi.textContent;
    }
    await atualizarCidadesPorEstado(spOption.value);

    const cidadeOption = [...filterCity.options].find(opt => (opt.textContent || "").toLowerCase() === "americana");
    if (cidadeOption) {
      filterCity.value = cidadeOption.value;               // ✅ seleciona
      const listaUl = document.getElementById("list-ul");  // marca no custom select (mobile)
      if (listaUl) {
        listaUl.querySelectorAll("li").forEach(el => el.classList.remove("active"));
        const cidadeLi = [...listaUl.querySelectorAll("li")].find(li => (li.dataset.value || "").toLowerCase() === "americana");
        if (cidadeLi) { cidadeLi.classList.add("active"); cidadeLi.classList.add("selected"); }
        const title = listaUl.closest(".custom-select")?.querySelector(".custom-select-title");
        if (title) title.textContent = "Americana";
      }
    }
  }

  await initMap();

  // ✅ já carrega FILTRADO em Americana (markers + cards)
  filtrar(); // vai chamar updateMapaLista com cidade = "Americana"
});

import { getClientToken, loginToken, API_BASE, CLIENT_ID, CLIENT_SECRET } from '../../auth.js';
import {gruposCache, carregarGrupos} from './grupos.js'
import { estabelecimentosCache, buscarEstabelecimentos  } from './estabelecimentos.js'
import {mostrarLoader, ocultarLoader} from '../../utils/loader.js'


// 🔥 cache em memória (módulo)
export let cuponsCache = [];
async function loadEstabelecimentosCache() {
  try {
    // 🔹 1. Tenta pegar do localStorage
    const cache = localStorage.getItem("estabelecimentosCache");

    if (cache) {
      try {
        const parsed = JSON.parse(cache);

        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log("✅ Cache de estabelecimentos carregado do localStorage");

          // opcional (se seu código usa window)
          window.estabelecimentosCache = parsed;

          return parsed;
        }
      } catch (e) {
        console.warn("⚠️ Cache inválido, será recarregado");
      }
    } else {
        

       try {
    console.log("Buscando estabelecimentos da API...");

    const res = await fetch(`${API_BASE}/api/Estabelecimentos`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Erro ao buscar estabelecimentos");

    const data = await res.json();

  

  }catch (e) {
        console.warn("⚠️Resposta da API não é um array");
      }
    }

   
   

    // 🔹 3. Salva no localStorage
    localStorage.setItem("estabelecimentosCache", JSON.stringify(data));

    // opcional
    window.estabelecimentosCache = data;

    console.log("✅ Cache salvo com sucesso");

    return data;

  } catch (error) {
    console.error("❌ Erro ao carregar estabelecimentos:", error);

    // fallback seguro
    return [];
  }
}



//-------------------------CUPOM----------------------------------------
export async function carregarCuponsPromocoes(forcarRecarregar = false) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Você precisa estar logado.");
    return [];
  }

  // 🔥 1. tenta carregar do localStorage
  if (cuponsCache.length === 0) {
    const cacheLocal = localStorage.getItem("cache_cupons_promocoes");
    if (cacheLocal) {
      try {
        cuponsCache = JSON.parse(cacheLocal);
window.cuponsCache = cuponsCache;

// 🔥 compatibilidade
window._cuponsPromocoes = cuponsCache;
window._cuponsPromocoesAtual = cuponsCache;
        console.log("Cupons carregados do localStorage");
      } catch {
        localStorage.removeItem("cache_cupons_promocoes");
      }
    }
  }

  // 🔥 2. usa cache se existir
if (cuponsCache.length > 0 && !forcarRecarregar) {
  console.log("Usando cupons do cache");

  // 🔥 garantir compatibilidade
  window.cuponsCache = cuponsCache;
  window._cuponsPromocoes = cuponsCache;
  window._cuponsPromocoesAtual = cuponsCache;

  renderizarPromocoes(cuponsCache);
  inicializarFiltrosCupons();

  return cuponsCache;
}

  try {
    console.log("Buscando cupons da API...");

    // 1️⃣ Buscar estabelecimentos
    const resEstab = await fetch(`${API_BASE}/api/Estabelecimentos`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!resEstab.ok) {
      throw new Error("Erro ao buscar estabelecimentos");
    }

    const estabelecimentos = await resEstab.json();

    // 2️⃣ Buscar cupons por estabelecimento
    const cuponsPorEstab = await Promise.all(
      estabelecimentos.map(estab =>
        fetch(`${API_BASE}/api/Cupons/por-estabelecimento/${estab.id}`, {
          headers: { Authorization: "Bearer " + token }
        })
          .then(res => (res.ok ? res.json() : []))
          .then(cupons =>
            cupons.map(c => ({
              id: c.id,
              nomeEstabelecimento: estab.nome
            }))
          )
          .catch(() => [])
      )
    );

    const cuponsBasicos = cuponsPorEstab.flat();

    if (!cuponsBasicos.length) {
      cuponsCache = [];
      window.cuponsCache = [];
      localStorage.setItem("cache_cupons_promocoes", JSON.stringify([]));

      renderizarPromocoes([]);
      inicializarFiltrosCupons();

      return [];
    }

    // 3️⃣ Buscar detalhes dos cupons
    const cuponsCompletos = await Promise.all(
      cuponsBasicos.map(cupomBase =>
        fetch(`${API_BASE}/api/Cupons/${cupomBase.id}`, {
          headers: { Authorization: "Bearer " + token }
        })
          .then(res => (res.ok ? res.json() : null))
          .then(cupomCompleto =>
            cupomCompleto
              ? {
                  ...cupomCompleto,
                  nomeEstabelecimento: cupomBase.nomeEstabelecimento
                }
              : null
          )
          .catch(() => null)
      )
    );

    const cuponsFiltrados = cuponsCompletos.filter(Boolean);

    // 🔥 4. atualizar cache
    cuponsCache = cuponsFiltrados;
    window.cuponsCache = cuponsFiltrados;
    window._cuponsPromocoes = cuponsFiltrados; // 🔥 ESSENCIAL

    localStorage.setItem(
      "cache_cupons_promocoes",
      JSON.stringify(cuponsFiltrados)
    );

    console.log(`${cuponsFiltrados.length} cupons carregados`);

    // 🔥 5. render
    renderizarPromocoes(cuponsFiltrados);
    inicializarFiltrosCupons();

    return cuponsFiltrados;

  } catch (err) {
    console.error("Erro ao carregar cupons:", err);

    // 🔥 fallback memória
    if (cuponsCache.length > 0) {
      console.warn("Usando cache em memória");
      renderizarPromocoes(cuponsCache);
      inicializarFiltrosCupons();
      return cuponsCache;
    }

    // 🔥 fallback localStorage
    const cacheLocal = localStorage.getItem("cache_cupons_promocoes");
    if (cacheLocal) {
      try {
        const dados = JSON.parse(cacheLocal);
        window.cuponsCache = dados;

        console.warn("Usando cache do localStorage");

        renderizarPromocoes(dados);
        inicializarFiltrosCupons();

        return dados;
      } catch {}
    }

    alert("Erro ao carregar cupons");
    return [];
  }
}


// --- renderizarPromocoes: REMOVER as linhas que sobrescrevem cuponsCache ---
function renderizarPromocoes(cupons) {
  const container = document.getElementById("listaPromocoes");
  if (!container) return;

  container.innerHTML = "";

  if (!cupons.length) {
    container.innerHTML = "<p>Nenhuma promoção encontrada.</p>";
    return;
  }

  // ❌ REMOVIDO: cuponsCache = [...cupons];
  // ❌ REMOVIDO: window.cuponsCache = cuponsCache;
  // ❌ REMOVIDO: window._cuponsPromocoes = cuponsCache;
  // ❌ REMOVIDO: window._cuponsPromocoesAtual = cuponsCache;
  // A função só renderiza — não altera o cache.

  const cuponsCacheMap = new Map();

  cupons.forEach(c => {
    cuponsCacheMap.set(c.id.toString(), c);

    const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPg==';

    const imagem = (c.imagens && c.imagens.length)
      ? (c.imagens.find(img => img.imagemTipoId === 1)?.url || PLACEHOLDER)
      : PLACEHOLDER;

    const cartoesVisiveis = c.cartoesAceitos?.slice(0, 2) || [];
    const cartoesExtras   = (c.cartoesAceitos?.length || 0) - 2;

    const cartoesHTML = cartoesVisiveis.length > 0
      ? cartoesVisiveis.map(cartao => `<span class="badge-cartao">${cartao.nome}</span>`).join('')
        + (cartoesExtras > 0 ? `<span class="badge-cartao badge-cartao-extra">+${cartoesExtras}</span>` : '')
      : '';

    const isPublicado = c.status === "Publicado";

    container.insertAdjacentHTML("beforeend", `
      <article class="cupom-card-admin" style="cursor:pointer;">
        <div class="cupom-media-admin">
          <img src="${imagem}" loading="lazy">
        </div>
        <div class="cartoes-cp">${cartoesHTML}</div>
        <div class="header-cp-admin">
          <h2>${c.titulo}</h2>
          <label class="switch-cupom-admin">
            <input type="checkbox" ${isPublicado ? "checked" : ""} data-cupom-id="${c.id}">
            <span class="slider-cupom-admin"></span>
          </label>
        </div>
        <div class="cupom-content-admin">
          <h3>${c.nomeEstabelecimento}</h3>
          <p><strong>Validade:</strong> ${new Date(c.dataExpiracao).toLocaleDateString()}</p>
          <div>
            <button class="btn-editar-cupom-admin" data-id="${c.id}">Editar</button>
            <button class="btn-excluir-cupom-admin" data-id="${c.id}">Excluir</button>
          </div>
        </div>
      </article>
    `);

    const article = container.lastElementChild;

    article.addEventListener("click", (e) => {
      if (e.target.closest("button") || e.target.closest("input")) return;
      abrirModalEditarCupom(c.id, c.nomeEstabelecimento, c.estabelecimentoId);
    });

    article.querySelector(".btn-editar-cupom-admin").addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalEditarCupom(c.id, c.nomeEstabelecimento, c.estabelecimentoId);
    });

    article.querySelector(".btn-excluir-cupom-admin").addEventListener("click", (e) => {
      e.stopPropagation();
      excluirCupomPromocao(c.id);
    });

    article.querySelector("input").addEventListener("change", async (e) => {
      e.stopPropagation();

      const cupomId    = e.target.dataset.cupomId;
      const isChecked  = e.target.checked;
      const novoStatus = isChecked ? "Publicado" : "Rascunho";

      try {
        await atualizarStatusCupomPatch(cupomId, novoStatus);

        // Atualiza APENAS no cuponsCache (fonte única)
        const index = cuponsCache.findIndex(cp => cp.id.toString() === cupomId);
        if (index !== -1) {
          cuponsCache[index].status = novoStatus;
          cuponsCache[index].ativo  = isChecked;
        }

        // Re-aplica filtros sobre o cache atualizado
        aplicarFiltrosCuponsAtual();

        console.log(`✅ Cupom ${cupomId} atualizado`);
      } catch (err) {
        console.error("❌ Erro:", err);
        e.target.checked = !isChecked;
      }
    });
  });

  window._cuponsCacheMap = cuponsCacheMap;
}

// ========== FUNÇÃO PATCH PARA ATUALIZAR STATUS DO CUPOM ==========
async function atualizarStatusCupomPatch(cupomId, novoStatus) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error("Token não encontrado");
  }

  try {
    console.log(`🔄 Atualizando status do cupom ${cupomId} para: ${novoStatus}`);
    
    const response = await fetch(`${API_BASE}/api/Cupons/${cupomId}/status`, {
      method: "PATCH",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(novoStatus) // Envia apenas a string: "Publicado" ou "Rascunho"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na resposta:", errorText);
      throw new Error(`Erro ao atualizar status: ${response.status} - ${errorText}`);
    }

    // Verifica se há conteúdo na resposta
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("✅ Resposta do servidor:", data);
      return data;
    }
    
    console.log("✅ Status atualizado com sucesso");
    return null;

  } catch (err) {
    console.error("❌ Erro ao fazer PATCH:", err);
    throw err;
  }
}

//FILTROS CUPOM
var filtrosCuponsAtivos = {
  busca: "",
  status: "todos",
  estabelecimento: "Todos",
  grupo: "Todos"
};

// ========== ENUM DE STATUS DO CUPOM ==========
const CupomStatus = {
  Rascunho: 0,
  Revisao: 1,
  Aprovado: 2,
  Publicado: 3,
  Pausado: 4,
  Expirado: 5
};

// Função helper para verificar se cupom está expirado
function cupomEstaExpirado(cupom) {
  const hoje = new Date();
  const dataExpiracao = new Date(cupom.dataExpiracao);
  return dataExpiracao < hoje;
}

// ========== INICIALIZAR FILTROS DE CUPONS ==========

async function inicializarFiltrosCupons() {
  console.log("🎟️ INICIANDO FILTROS DE CUPONS...");

  // ✅ Fonte única de verdade
  if (!cuponsCache || cuponsCache.length === 0) {
    console.warn("⚠️ cuponsCache vazio ou não existe!");
    return;
  }

  console.log(`✅ ${cuponsCache.length} cupons encontrados`);

  // 🔥 (opcional) compatibilidade com código antigo
  if (!window._cuponsPromocoes) {
    window._cuponsPromocoes = cuponsCache;
  }

  // Popula filtros
  setTimeout(async () => {
     await _popularFiltroEstabelecimentosCupom();
  }, 3500);
 
  _popularFiltroGruposCupom();

  // Listeners
  _configurarEventListenersCupons();

  // Contadores
  _atualizarContadoresCupons();

  // 🔥 agora sempre baseado no cuponsCache
  aplicarFiltrosCupons();

  console.log("✅ FILTROS DE CUPONS INICIALIZADOS!");
}

async function _popularFiltroEstabelecimentosCupom() {
  console.log("🏢 Populando estabelecimentos nos filtros de cupom...");

  const select = document.getElementById("filtroCupomEstabelecimento");
  if (!select) {
    console.error("❌ Select filtroCupomEstabelecimento não encontrado!");
    return;
  }
  
  // Busca do cache ou API, e usa o retorno diretamente
  const estabelecimentos = await buscarEstabelecimentos(false);

  if (!Array.isArray(estabelecimentos) || estabelecimentos.length === 0) {
    console.warn("⚠️ Nenhum estabelecimento disponível");
    return;
  }

  select.innerHTML = '<option value="Todos">Todos</option>';

  const ordenados = [...estabelecimentos].sort((a, b) =>
    (a.nome || '').localeCompare(b.nome || '')
  );

  ordenados.forEach(estab => {
    if (estab && estab.id && estab.nome) {
      const option = document.createElement("option");
      option.value = estab.id;
      option.textContent = estab.nome;
      select.appendChild(option);
    }
  });

  console.log(`✅ ${ordenados.length} estabelecimentos adicionados ao select`);
}
// ========== POPULAR GRUPOS (USA CACHE EXISTENTE) ==========
async function _popularFiltroGruposCupom() {
  console.log("👥 Populando grupos nos filtros de cupom...");

  const select = document.getElementById("filtroCupomGrupo");
  if (!select) {
    console.error("❌ Select filtroCupomGrupo não encontrado!");
    return;
  }

  // Garante que o cache está populado
  if (!gruposCache || gruposCache.length === 0) {
    console.log("Cache vazio, buscando da API...");
    await carregarGrupos(false);
  }

  // Após o await, lê direto do localStorage como fallback garantido
  let grupos = gruposCache;
  if (!Array.isArray(grupos) || grupos.length === 0) {
    const cacheLocal = localStorage.getItem("gruposCache");
    grupos = cacheLocal ? JSON.parse(cacheLocal) : [];
  }

  if (grupos.length === 0) {
    console.warn("⚠️ Nenhum grupo disponível");
    return;
  }

  select.innerHTML = '<option value="Todos">Todos</option>';

  grupos.forEach(grupo => {
    if (grupo && grupo.id && grupo.nome) {
      const option = document.createElement("option");
      option.value = grupo.id;
      option.textContent = grupo.nome;
      select.appendChild(option);
    }
  });

  console.log(`✅ ${grupos.length} grupos adicionados ao select`);
}

// ========== CONFIGURAR EVENT LISTENERS ========== 
// --- Tabs de status: corrigido para não acumular listeners ---
function _configurarEventListenersCupons() {
  console.log("🎧 Configurando event listeners de cupons...");

  const inputBusca = document.querySelector(".search-cupom");
  if (inputBusca) {
    // Clona para remover listeners anteriores
    const novo = inputBusca.cloneNode(true);
    inputBusca.parentNode.replaceChild(novo, inputBusca);
    novo.addEventListener("input", (e) => {
      filtrosCuponsAtivos.busca = e.target.value;
      aplicarFiltrosCuponsAtual();
    });
  }

  // Tabs de status
  const tabs = document.querySelectorAll(".tab-filtro-cupom");
  tabs.forEach(tab => {
    // Clona para remover listeners anteriores (evita acumulação)
    const novaTab = tab.cloneNode(true);
    tab.parentNode.replaceChild(novaTab, tab);
    novaTab.addEventListener("click", function() {
      document.querySelectorAll(".tab-filtro-cupom").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      filtrosCuponsAtivos.status = this.getAttribute("data-status");
      aplicarFiltrosCuponsAtual();
    });
  });

  const selectEstab = document.getElementById("filtroCupomEstabelecimento");
  if (selectEstab) {
    const novo = selectEstab.cloneNode(true);
    selectEstab.parentNode.replaceChild(novo, selectEstab);
    novo.addEventListener("change", async (e) => {
      const valor = e.target.value;
      filtrosCuponsAtivos.estabelecimento = valor;

      if (valor === 'Todos') {
        window._cuponsPromocoesAtual = null;
        aplicarFiltrosCuponsAtual();
      } else {
        await buscarCuponsPorEstabelecimento(parseInt(valor));
      }
    });
  }

  const selectGrupo = document.getElementById("filtroCupomGrupo");
  if (selectGrupo) {
    const novo = selectGrupo.cloneNode(true);
    selectGrupo.parentNode.replaceChild(novo, selectGrupo);
    novo.addEventListener("change", (e) => {
      filtrosCuponsAtivos.grupo = e.target.value;
      aplicarFiltrosCuponsAtual();
    });
  }
}

// --- aplicarFiltrosCuponsAtual: decide qual lista base usar ---
function aplicarFiltrosCuponsAtual() {
  let listaBase;

  if (
    filtrosCuponsAtivos.estabelecimento &&
    filtrosCuponsAtivos.estabelecimento !== 'Todos' &&
    Array.isArray(window._cuponsPromocoesAtual)
  ) {
    // Filtro por estabelecimento: usa lista específica
    listaBase = window._cuponsPromocoesAtual;
  } else {
    // Caso geral: usa o cache completo
    listaBase = cuponsCache;
  }

  aplicarFiltrosGenerico(listaBase);
}
// ========== BUSCAR CUPONS POR ESTABELECIMENTO ==========
async function buscarCuponsPorEstabelecimento(estabelecimentoId) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  const container = document.getElementById("listaPromocoes");
  
  try {
    console.log(`🔍 Buscando cupons do estabelecimento ${estabelecimentoId}...`);
    
    // Mostra loading
    if (container) {
      container.innerHTML = "<p>Carregando...</p>";
    }
    
    // 1️⃣ Busca IDs dos cupons do estabelecimento
    const resCupons = await fetch(
      `${API_BASE}/api/Cupons/por-estabelecimento/${estabelecimentoId}`,
      {
        headers: { Authorization: "Bearer " + token }
      }
    );

    if (!resCupons.ok) {
      console.log(`⚠️ Nenhum cupom encontrado para o estabelecimento ${estabelecimentoId}`);
      window._cuponsPromocoesAtual = [];
      renderizarPromocoes([]);
      _atualizarContadoresCuponsComLista([]);
      return;
    }

    const cuponsBasicos = await resCupons.json();
    
    console.log(`  Encontrados ${cuponsBasicos.length} cupons básicos`);

    if (!cuponsBasicos.length) {
      window._cuponsPromocoesAtual = [];
      renderizarPromocoes([]);
      _atualizarContadoresCuponsComLista([]);
      return;
    }

    // 2️⃣ Busca dados completos de cada cupom
    const cuponsCompletos = await Promise.all(
      cuponsBasicos.map(cupomBase =>
        fetch(`${API_BASE}/api/Cupons/${cupomBase.id}`, {
          headers: { Authorization: "Bearer " + token }
        })
          .then(res => res.ok ? res.json() : null)
          .then(cupomCompleto => {
            if (!cupomCompleto) return null;
            
            // Adiciona o nome do estabelecimento
            const estab = estabelecimentosCache.find(e => e.id === estabelecimentoId);
            return {
              ...cupomCompleto,
              nomeEstabelecimento: estab ? estab.nome : 'Estabelecimento'
            };
          })
          .catch(() => null)
      )
    );

    const cuponsFiltrados = cuponsCompletos.filter(Boolean);
    
    console.log(`✅ ${cuponsFiltrados.length} cupons completos carregados`);

    // 3️⃣ Salva a lista atual de cupons (sem filtros de status ainda)
    window._cuponsPromocoesAtual = cuponsFiltrados;

    // 4️⃣ Aplica os filtros (status, busca, grupo)
    
      aplicarFiltrosCuponsAtual();

  } catch (err) {
    console.error("❌ Erro ao buscar cupons do estabelecimento:", err);
    window._cuponsPromocoesAtual = [];
    renderizarPromocoes([]);
    _atualizarContadoresCuponsComLista([]);
  }
}

// --- Função de filtro centralizada: sempre lê do cuponsCache ---
function aplicarFiltrosGenerico(listaBase) {
  // listaBase é sempre uma CÓPIA — nunca altera o original
  let resultado = listaBase.filter(c => {

    // BUSCA
    if (filtrosCuponsAtivos.busca?.trim()) {
      const termo = filtrosCuponsAtivos.busca.toLowerCase();
      const coincide =
        (c.titulo || '').toLowerCase().includes(termo) ||
        (c.codigo || '').toLowerCase().includes(termo) ||
        (c.nomeEstabelecimento || '').toLowerCase().includes(termo);
      if (!coincide) return false;
    }

    // STATUS
    const status = filtrosCuponsAtivos.status;
    if (status && status !== "todos") {
      if (status === "publicados") {
        if (!(c.status === "Publicado" && c.ativo === true && !cupomEstaExpirado(c))) return false;
      } else if (status === "expirados") {
        if (!(cupomEstaExpirado(c) || c.status === "Expirado")) return false;
      } else if (status === "rascunhos") {
        if (c.status !== "Rascunho") return false;
      }
    }

    // GRUPO
    if (filtrosCuponsAtivos.grupo && filtrosCuponsAtivos.grupo !== 'Todos') {
      const grupoId = parseInt(filtrosCuponsAtivos.grupo);
      const estabs  = (window.estabelecimentosCache || [])
        .filter(e => e.grupoId === grupoId)
        .map(e => e.id);
      const estab   = (window.estabelecimentosCache || [])
        .find(e => e.nome === c.nomeEstabelecimento);
      if (!estab || !estabs.includes(estab.id)) return false;
    }

    return true;
  });

  console.log(`✅ Resultado final: ${resultado.length}`);

  // Renderiza o resultado filtrado (sem tocar no cuponsCache)
  renderizarPromocoes(resultado);

  // Contadores sempre baseados na listaBase (sem filtro de status)
  _atualizarContadoresCuponsComLista(listaBase);
}



// ========== APLICAR FILTROS (MANTÉM ORIGINAL PARA "TODOS") ==========
// --- aplicarFiltrosCupons: entrada pública (sem estabelecimento específico) ---
function aplicarFiltrosCupons() {
  window._cuponsPromocoesAtual = null; // limpa filtro específico
  aplicarFiltrosCuponsAtual();
}
// ========== ATUALIZAR CONTADORES ==========
function _atualizarContadoresCupons() {
  if (!window._cuponsPromocoes || !Array.isArray(window._cuponsPromocoes)) {
    return;
  }
  
  const total = window._cuponsPromocoes.length;
  
  // Publicados: status = "Publicado" E não expirado E ativo
  const publicados = window._cuponsPromocoes.filter(cupom => {
    return cupom.status === "Publicado" && 
           cupom.ativo === true && 
           !cupomEstaExpirado(cupom);
  }).length;
  
  // Expirados: dataExpiracao < hoje OU status = "Expirado"
  const expirados = window._cuponsPromocoes.filter(cupom => {
    return cupomEstaExpirado(cupom) || cupom.status === "Expirado";
  }).length;
  
  // Rascunhos: status = "Rascunho"
  const rascunhos = window._cuponsPromocoes.filter(cupom => {
    return cupom.status === "Rascunho";
  }).length;
  
  const countTodos = document.getElementById("count-cupons-todos");
  const countPublicados = document.getElementById("count-cupons-publicados");
  const countExpirados = document.getElementById("count-cupons-expirados");
  const countRascunhos = document.getElementById("count-cupons-rascunhos");
  
  if (countTodos) countTodos.textContent = total;
  if (countPublicados) countPublicados.textContent = publicados;
  if (countExpirados) countExpirados.textContent = expirados;
  if (countRascunhos) countRascunhos.textContent = rascunhos;
  
  console.log(`📊 Contadores Cupons: Total=${total}, Publicados=${publicados}, Expirados=${expirados}, Rascunhos=${rascunhos}`);
}

// ========== ATUALIZAR CONTADORES COM LISTA CUSTOMIZADA ==========
function _atualizarContadoresCuponsComLista(listaCupons) {
  if (!listaCupons || !Array.isArray(listaCupons)) {
    return;
  }
  
  const total = listaCupons.length;
  
  // Publicados: status = "Publicado" E não expirado E ativo
  const publicados = listaCupons.filter(cupom => {
    return cupom.status === "Publicado" && 
           cupom.ativo === true && 
           !cupomEstaExpirado(cupom);
  }).length;
  
  // Expirados: dataExpiracao < hoje OU status = "Expirado"
  const expirados = listaCupons.filter(cupom => {
    return cupomEstaExpirado(cupom) || cupom.status === "Expirado";
  }).length;
  
  // Rascunhos: status = "Rascunho"
  const rascunhos = listaCupons.filter(cupom => {
    return cupom.status === "Rascunho";
  }).length;
  
  const countTodos = document.getElementById("count-cupons-todos");
  const countPublicados = document.getElementById("count-cupons-publicados");
  const countExpirados = document.getElementById("count-cupons-expirados");
  const countRascunhos = document.getElementById("count-cupons-rascunhos");
  
  if (countTodos) countTodos.textContent = total;
  if (countPublicados) countPublicados.textContent = publicados;
  if (countExpirados) countExpirados.textContent = expirados;
  if (countRascunhos) countRascunhos.textContent = rascunhos;
  
  console.log(`📊 Contadores Cupons (filtrado): Total=${total}, Publicados=${publicados}, Expirados=${expirados}, Rascunhos=${rascunhos}`);
}

// ========== LIMPAR FILTROS ==========
// --- limparFiltrosCupons: reseta tudo e volta ao cache completo ---
function limparFiltrosCupons() {
  filtrosCuponsAtivos = {
    busca: "",
    status: "todos",
    estabelecimento: "Todos",
    grupo: "Todos"
  };

  window._cuponsPromocoesAtual = null;

  const inputBusca = document.querySelector(".search-cupom");
  if (inputBusca) inputBusca.value = "";

  const selectEstab = document.getElementById("filtroCupomEstabelecimento");
  if (selectEstab) selectEstab.value = "Todos";

  const selectGrupo = document.getElementById("filtroCupomGrupo");
  if (selectGrupo) selectGrupo.value = "Todos";

  document.querySelectorAll(".tab-filtro-cupom").forEach(tab => {
    tab.classList.toggle("active", tab.getAttribute("data-status") === "todos");
  });

  // Re-renderiza a partir do cache original intacto
  aplicarFiltrosGenerico(cuponsCache);
}
// Cache para armazenar dados
let estabelecimentosModalCache = [];
let cartoesModalCache = [];

// ========================================
// 🔹 RENDERIZAR IMAGENS DO CUPOM
// ========================================
function renderizarImagensCupomEdicao(cupom) {
  const container = document.getElementById("imagensCupomEditContainer");
  if (!container) return;
  container.innerHTML = "";

  const imagens = cupom.imagens || [];
  const imagemGaleria = imagens.find(img => img.imagemTipoId === 1) || null;
  const imagemModal   = imagens.find(img => img.imagemTipoId === 2) || null;

  container.appendChild(
    criarBlocoImagemCupom({
      titulo: "Imagem Cupom (Card)",
      imagem: imagemGaleria,
      cupomId: cupom.id,
      imagemTipoId: 1
    })
  );

  container.appendChild(
    criarBlocoImagemCupom({
      titulo: "Imagem Modal",
      imagem: imagemModal,
      cupomId: cupom.id,
      imagemTipoId: 2
    })
  );
}
// ========================================
// 🔹 CRIAR BLOCO DE IMAGEM (UI)
// ========================================
function criarBlocoImagemCupom({ titulo, imagem, cupomId, imagemTipoId }) {
  const div = document.createElement("div");
  div.className = "imagem-edit-item";

  const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

  const imagemId  = imagem?.id  || null;
  const srcImagem = imagem?.url || PLACEHOLDER;

  div.innerHTML = `
    <strong>${titulo}</strong>
    <div class="upload-card upload-cupom">
      <img />
      <div class="upload-overlay">
        <label class="upload-action">
          <img src="./imgs/image-up.png" class="icon-edit" />
          <input
            type="file"
            accept="image/*"
            onchange="${
              imagemId
                ? `substituirImagemCupom(event, ${cupomId}, ${imagemId})`
                : `adicionarImagemNovaCupom(event, ${cupomId}, ${imagemTipoId})`
            }"
          />
        </label>
        ${
          imagemId
            ? `<button type="button" class="upload-action danger"
                onclick="excluirImagemCupom(${cupomId}, ${imagemId})">
                <img src="./imgs/trash-02.png" class="icon-edit" />
               </button>`
            : ""
        }
      </div>
    </div>
  `;

  const img = div.querySelector("img");
  img.src = srcImagem;
  img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };

  return div;
}
// ========================================
// 🔹 ADICIONAR NOVA IMAGEM
// ========================================
async function adicionarImagemNovaCupom(event, cupomId) {
  const file = event.target.files[0];
  if (!file) return;
  await enviarImagemCupom(cupomId, file, true);
  alert("Imagem adicionada com sucesso");
  await recarregarCupomEdit();
}

async function enviarImagemCupom(cupomId, file, isPrincipal = true, imagemTipoId = 1) {
  const token = localStorage.getItem("token");
  if (!token) { alert("Token não encontrado"); return; }

  const formData = new FormData();
  formData.append("imagem", file);

  try {
    const res = await fetch(`${API_BASE}/api/cupons/${cupomId}/imagens?imagemTipoId=${imagemTipoId}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData
    });

    if (!res.ok) {
      const erroTexto = await res.text();
      console.error("❌ Resposta da API:", res.status, erroTexto);
      throw new Error("Erro ao enviar imagem");
    }

    return await res.json();

  } catch (err) {
    console.error("Erro ao enviar imagem:", err);
    throw err;
  }
}

async function excluirImagemCupom(cupomId, imagemId) {
  const token = localStorage.getItem("token");
  if (!confirm("Deseja realmente excluir esta imagem?")) return;

  if (!imagemId) {
    alert("Nenhuma imagem encontrada para excluir.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/cupons/${cupomId}/imagens/${imagemId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Erro ao excluir imagem");

    await recarregarCupomEdit();

  } catch (err) {
    console.error(err);
    alert("Erro ao excluir imagem: " + err.message);
  }
}

async function substituirImagemCupom(event, cupomId, imagemId) {
  const file = event.target.files[0];
  if (!file) return;
  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    // Busca o tipo da imagem atual no _cupomAtual
    const imagens = _cupomAtual?.imagens || [];
    const imagemAtual = imagens.find(img => img.id === imagemId);
    const imagemTipoId = imagemAtual?.imagemTipoId || 1;

    if (imagemId) {
      const delResp = await fetch(`${API_BASE}/api/cupons/${cupomId}/imagens/${imagemId}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
      });
      if (!delResp.ok && delResp.status !== 404) {
        throw new Error("Erro ao excluir imagem antiga");
      }
    }

    await enviarImagemCupom(cupomId, file, true, imagemTipoId);
    await recarregarCupomEdit();

  } catch (err) {
    console.error(err);
    alert("Erro ao substituir a imagem: " + err.message);
  } finally {
    event.target.value = "";
  }
}
// ========================================
// 🔹 RECARREGAR CUPOM NO MODAL
// ========================================
async function recarregarCupomEdit() {
  if (!_cupomAtual?.id) return;
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/api/Cupons/${_cupomAtual.id}`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return;

    const cupomAtualizado = await res.json();
    cupomAtualizado.nomeEstabelecimento = _cupomAtual.nomeEstabelecimento;
    _cupomAtual = cupomAtualizado;
    window._cupomEditando = cupomAtualizado;

    // imagens são objetos com .url e .id
    const imagens = cupomAtualizado.imagens || [];
    const imagemGaleria = imagens.find(img => img.imagemTipoId === 1);
    const imgUrl = imagemGaleria?.url || (imagens.length > 0 ? imagens[imagens.length - 1]?.url : null);

    if (imgUrl) {
      document.getElementById("cpv-card-img").src  = imgUrl;
      document.getElementById("cpv-modal-img").src = imgUrl;
      document.getElementById("cp-thumb-galeria").innerHTML = `<img src="${imgUrl}" alt="preview">`;
    }

    // Re-renderiza o bloco de imagem com o id correto
    renderizarImagensCupomEdicao(cupomAtualizado);

  } catch (err) {
    console.error("Erro ao recarregar cupom:", err);
  }
}



async function excluirCupomPromocao(id) {
  const confirmar = confirm("Tem certeza que deseja excluir este cupom?");
  if (!confirmar) return;

  const token = localStorage.getItem("token");
  mostrarLoader("Excluindo Cupom...", "Acessando o Banco");
  try {
    const res = await fetch(`${API_BASE}/api/Cupons/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) {
      const erro = await res.text();
      throw new Error(erro);
    }

    console.log("Cupom Excluido com sucesso")

    // 🔄 Força recarregar ignorando cache
    carregarCuponsPromocoes(true);

  } catch (err) {
    console.error("Erro ao excluir cupom:", err);
    alert("Erro ao excluir cupom.");
  } finally {
        ocultarLoader()
  }
}

  // Fechar ao clicar fora do modal
  document.getElementById("modalEditarCupom").addEventListener("click", (e) => {
    if (e.target.id === "modalEditarCupom") {
      fecharModalEditarCupom();
    }
  });


async function buscarImagemCupom(cupomId) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/api/Cupons/${cupomId}/imagens`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) return null;

    const imagens = await res.json();

    if (!imagens || imagens.length === 0) return null;

    // ajuste conforme o backend (url, caminho, base64 etc.)
    return imagens[0].url || imagens[0].caminho || null;

  } catch (err) {
    console.error("Erro ao buscar imagem do cupom", err);
    return null;
  }
}

// ========== FUNÇÃO PARA POPULAR O SELECT CUPOM ==========


async function renderizarCheckboxesEstabelecimentos() {
  console.log("📋 Renderizando checkboxes de estabelecimentos...");
  
  const container = document.querySelector(".estabelecimentos-checkbox-container");
  if (!container) {
    console.error("❌ Container .estabelecimentos-checkbox-container não encontrado!");
    return;
  }

  // Limpa o container
  container.innerHTML = '<p class="carregando-estabelecimentos">Carregando estabelecimentos...</p>';

  // Verifica se tem estabelecimentos no cache
  if (!window.estabelecimentosCache || estabelecimentosCache.length === 0) {
    console.warn("⚠️ Nenhum estabelecimento no cache, buscando...");
    
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("❌ Token não encontrado");
      container.innerHTML = '<p class="erro-estabelecimentos">Erro: Token não encontrado</p>';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/Estabelecimentos`, {
        headers: { Authorization: "Bearer " + token }
      });

      if (!res.ok) throw new Error("Erro ao buscar estabelecimentos");
      
      const data = await res.json();
      estabelecimentosCache = data;
      
    } catch (err) {
      console.error("❌ Erro ao buscar estabelecimentos:", err);
      container.innerHTML = `<p class="erro-estabelecimentos">Erro ao carregar estabelecimentos: ${err.message}</p>`;
      return;
    }
  }

  // Limpa o container novamente antes de adicionar os checkboxes
  container.innerHTML = "";

  // Agrupa estabelecimentos por similaridade de nome
  const grupos = agruparEstabelecimentosPorSimilaridade(estabelecimentosCache);

  // Renderiza os grupos
  grupos.forEach(grupo => {
    // Cria um wrapper para cada grupo
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "grupo-estabelecimentos";

    // Se o grupo tem mais de um estabelecimento, adiciona um título
    if (grupo.estabelecimentos.length > 1) {
      const tituloGrupo = document.createElement("h4");
      tituloGrupo.className = "titulo-grupo-estabelecimentos";
      tituloGrupo.textContent = grupo.nomeBase;
      grupoDiv.appendChild(tituloGrupo);
    }

    // Cria os checkboxes para cada estabelecimento do grupo
    grupo.estabelecimentos.forEach(estab => {
      const label = document.createElement("label");
      label.className = "field-checkbox-estabelecimento";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "estabelecimentos[]";
      input.value = estab.id;
      input.id = `estab-${estab.id}`;
      input.dataset.estabelecimentoNome = estab.nome;

      const span = document.createElement("span");
      span.textContent = `${estab.nome}${estab.cidade ? ` - ${estab.cidade}` : ''}`;

      label.appendChild(input);
      label.appendChild(span);

      grupoDiv.appendChild(label);
    });

    container.appendChild(grupoDiv);
  });

  console.log(`✅ ${estabelecimentosCache.length} estabelecimentos renderizados em ${grupos.length} grupos`);
}

// Função auxiliar para agrupar estabelecimentos por similaridade
function agruparEstabelecimentosPorSimilaridade(estabelecimentos) {
  const grupos = [];
  const processados = new Set();

  // Ordena por nome primeiro
  const estabelecimentosOrdenados = [...estabelecimentos].sort((a, b) => 
    a.nome.localeCompare(b.nome)
  );

  estabelecimentosOrdenados.forEach(estab => {
    if (processados.has(estab.id)) return;

    // Extrai o nome base (remove números, "filial", "unidade", etc)
    const nomeBase = extrairNomeBase(estab.nome);

    // Encontra estabelecimentos similares
    const similares = estabelecimentosOrdenados.filter(e => {
      if (processados.has(e.id)) return false;
      const nomeBaseOutro = extrairNomeBase(e.nome);
      return calcularSimilaridade(nomeBase, nomeBaseOutro) > 0.7; // 70% de similaridade
    });

    // Marca todos como processados
    similares.forEach(s => processados.add(s.id));

    grupos.push({
      nomeBase: nomeBase,
      estabelecimentos: similares
    });
  });

  return grupos;
}

// Extrai o nome base removendo números, filiais, etc
function extrairNomeBase(nome) {
  return nome
    .replace(/\s*-\s*(filial|unidade|loja|un\.?)\s*\d+/gi, '')
    .replace(/\s*\d+\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calcula similaridade entre dois textos (algoritmo simples)
function calcularSimilaridade(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  // Verifica se um contém o outro
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8;
  }

  // Calcula palavras em comum
  const palavras1 = s1.split(' ');
  const palavras2 = s2.split(' ');
  const palavrasComuns = palavras1.filter(p => palavras2.includes(p));
  
  const totalPalavras = Math.max(palavras1.length, palavras2.length);
  return palavrasComuns.length / totalPalavras;
}

// Função auxiliar para obter estabelecimentos selecionados
function obterEstabelecimentosSelecionados() {
  const checkboxes = document.querySelectorAll('input[name="estabelecimentos[]"]:checked');
  return Array.from(checkboxes).map(cb => ({
    id: cb.value,
    nome: cb.dataset.estabelecimentoNome
  }));
}


async function carregarCartoesParaCupom() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/Cartoes`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      throw new Error("Erro ao buscar cartões");
    }

    const cartoes = await res.json();

    console.log("Cartões carregados:", cartoes);
    const container = document.querySelector(".cupom-cards-row");

    if (!container) {
      console.error("Container .cupom-cards-row não encontrado!");
      return;
    }

    container.innerHTML = "";

    cartoes.forEach(cartao => {
      const label = document.createElement("label");
      label.className = "field-checkbox-cartao";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "cartoes-cupom[]";
      input.value = cartao.id;
      input.id = `cartao-cupom-${cartao.id}`;

      const span = document.createElement("span");
      span.textContent = cartao.nome;

      label.appendChild(input);
      label.appendChild(span);

      container.appendChild(label);
    });

  } catch (error) {
    console.error(error);
    alert("Não foi possível carregar os cartões.");
  }
}

// Função para obter IDs dos cartões selecionados no formulário de cupom
function obterCartoesSelecionadosCupom() {
  return Array.from(
    document.querySelectorAll('#cp-cards-row-preview input[type="checkbox"]:checked')
  ).map(input => parseInt(input.dataset.id));
}


async function cadastrarCupom() {
  
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  if (getBotaoCupom()?.disabled) return;

  const estabelecimentosSelecionados = obterEstabelecimentosSelecionados();
  if (!estabelecimentosSelecionados || estabelecimentosSelecionados.length === 0) {
    alert("Por favor, selecione pelo menos um estabelecimento!");
    return;
  }

  const cartoesSelecionados = obterCartoesSelecionadosCupom();

  function toIso(dt) {
    return dt ? new Date(dt).toISOString() : null;
  }

  const ativo = document.getElementById("cp-ativo").checked;

  const valorDesconto     = parseFloat(document.getElementById("cp-valorDesconto").value);
  const valorMinimoCompra = parseFloat(document.getElementById("cp-valorMinimoCompra").value) || 0;
  const limiteUso         = parseInt(document.getElementById("cp-limiteUso").value) || 0;
  const limiteUsoPorUsuario = parseInt(document.getElementById("cp-limiteUsoPorUsuario").value) || 0;

  // Validação dos campos obrigatórios
  if (!document.getElementById("cp-codigo").value.trim()) {
    alert("Preencha o código do cupom!"); return;
  }
  if (!document.getElementById("cp-titulo").value.trim()) {
    alert("Preencha o título do cupom!"); return;
  }
  if (isNaN(valorDesconto)) {
    alert("Preencha o valor de desconto!"); return;
  }
  if (!document.getElementById("cp-dataInicio").value) {
    alert("Preencha a data de início!"); return;
  }
  if (!document.getElementById("cp-dataExpiracao").value) {
    alert("Preencha a data de expiração!"); return;
  }


  const data = {
    codigo:               document.getElementById("cp-codigo").value.trim(),
    titulo:               document.getElementById("cp-titulo").value.trim(),
    descricao:            document.getElementById("cp-descricao").value.trim(),
    modalTitulo:          document.getElementById("cp-modalTitulo").value.trim(),
    modalDescricao:       document.getElementById("cp-modalDescricao").value.trim(),
    tipo:                 "Percentual",
    valorDesconto,
    valorMinimoCompra,
    dataInicio:           toIso(document.getElementById("cp-dataInicio").value),
    dataExpiracao:        toIso(document.getElementById("cp-dataExpiracao").value),
    limiteUso,
    limiteUsoPorUsuario,
    ativo: ativo,
    estabelecimentoId:    parseInt(estabelecimentosSelecionados[0].id),
    status:               ativo ? "Publicado" : "Rascunho",
    cartoesAceitosIds:    cartoesSelecionados,
    tag: document.getElementById("cp-tagCupom").value.trim()
  };

  // 👇 LOG para conferir o payload antes de enviar
  console.log("Payload enviado:", JSON.stringify(data, null, 2));
  mostrarLoader("Cadastrando cupom...", "Salvando dados e enviando imagens...");
  travarBotaoCupom();
  try {
    const res = await fetch(`${API_BASE}/api/Cupons`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    // 👇 Lê o corpo do erro para diagnóstico
    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resposta da API (erro):", errBody);
      throw new Error(`Erro ao criar cupom: ${res.status} — ${errBody}`);
    }

    
  const cupomCriado = await res.json();
const cupomId = cupomCriado.id;
console.log("Cupom criado com ID:", cupomId);

// 👇 Força o status correto logo após criar
if (ativo) {
  await atualizarStatusCupomPatch(cupomId, "Publicado");
  console.log("Status forçado para Publicado");
}

    const galeriaFile = document.getElementById("cp-imgGaleria").files[0];
    const modalFile   = document.getElementById("cp-imgModal").files[0];

    // imagemTipoId: 1 = Galeria, 2 = Modal (conforme a entidade que você mostrou)
if (galeriaFile) { await enviarImagemCupom(cupomId, galeriaFile, true, 1); console.log("Imagem Galeria enviada!"); }
if (modalFile)   { await enviarImagemCupom(cupomId, modalFile,   true, 2); console.log("Imagem Modal enviada!"); }

    alert("Cupom criado com sucesso!");
     carregarCuponsPromocoes(true);

    // Reset — usa o ID correto do form novo
    document.getElementById("formCupomPreview").reset();
    renderizarCheckboxesEstabelecimentos();
    carregarCartoesParaCupom();

  } catch (err) {
    alert("Erro: " + err.message);
    console.error(err);
  } finally {
    ocultarLoader(); 
     destravarBotaoCupom();
  }
}

function getBotaoCupom() {
  return document.querySelector(".btn-salvar-preview");
}

function travarBotaoCupom() {
  const btn = getBotaoCupom();
  if (!btn) return;

  btn.disabled = true;
  btn.dataset.originalText = btn.innerHTML;
  btn.innerHTML = "⏳ Cadastrando...";
}

function destravarBotaoCupom() {
  const btn = getBotaoCupom();
  if (!btn) return;

  btn.disabled = false;
  btn.innerHTML = btn.dataset.originalText || "💾 Cadastrar Cupom";
}


// ============================================================
//  MODAL CUPOM UNIFICADO — Criar + Ver + Editar
//  Substitui todo o bloco anterior do cupom-modal-unificado.js
// ============================================================

let _cupomAtual      = null;   // null = criação | objeto = edição
let _modoEdicaoCupom = false;  // false = visualização | true = editando
let cpImgGaleriaUrl  = null;
let cpImgModalUrl    = null;

// ============================================================
//  MODOS — visualização / edição / criação
// ============================================================

function _setCupomModoVisualizacao() {
  // Esconde inputs, mostra ver-values
  document.querySelectorAll("#formCupomPreview .ver-input").forEach(el => el.style.display = "none");
  document.querySelectorAll("#formCupomPreview .ver-value").forEach(el => el.style.display = "");

  // Botões
  document.getElementById("cp-actions-visualizacao").style.display = "";
  document.getElementById("cp-actions-edicao").style.display       = "none";
  document.getElementById("cp-actions-rodape-criar").style.display = "none";

  // Badges de status visíveis
  document.getElementById("cp-status-badges").style.display = "";

  _modoEdicaoCupom = false;
}

function _setCupomModoCriacao() {
  // Mostra inputs, esconde ver-values
  document.querySelectorAll("#formCupomPreview .ver-input").forEach(el => el.style.display = "");
  document.querySelectorAll("#formCupomPreview .ver-value").forEach(el => el.style.display = "none");

  // Botões
  document.getElementById("cp-actions-visualizacao").style.display = "none";
  document.getElementById("cp-actions-edicao").style.display       = "none";
  document.getElementById("cp-actions-rodape-criar").style.display = "";

  // Badges de status ocultos na criação
  document.getElementById("cp-status-badges").style.display = "none";

  document.getElementById("cp-form-titulo").textContent = "Cadastrar Cupom";
  _modoEdicaoCupom = false;
}

function ativarModoEdicaoCupom() {
  if (!_cupomAtual) return;

  document.querySelectorAll("#formCupomPreview .ver-input").forEach(el => el.style.display = "");
  document.querySelectorAll("#formCupomPreview .ver-value").forEach(el => el.style.display = "none");

  document.getElementById("cp-actions-visualizacao").style.display = "none";
  document.getElementById("cp-actions-edicao").style.display       = "";
  document.getElementById("cp-actions-rodape-criar").style.display = "none";
  document.getElementById("cp-status-badges").style.display        = "";

  document.getElementById("cp-form-titulo").textContent = "Editar Cupom";
  _modoEdicaoCupom = true;

  // Liga preview reativo ao ativar edição
  _ligarPreviewReativoCupom();
}

function cancelarModoEdicaoCupom() {
  if (!_cupomAtual) return;
  // Repopula os ver-values com os dados originais e volta ao modo visualização
  _popularVerValuesCupom(_cupomAtual);
  _setCupomModoVisualizacao();
  sincronizarCupomPreview();
}

// ============================================================
//  ABRIR MODAL — Criação
// ============================================================
function abrirPreviewCupom() {
  _cupomAtual      = null;
  _modoEdicaoCupom = false;

  _resetarFormCupom();
  _setCupomModoCriacao();

  const modal = document.getElementById("modal-preview-cupom");
  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("active"), 10);

  cpPopularCartoes();
  cpPopularEstabelecimentos();

  _ligarPreviewReativoCupom();
  sincronizarCupomPreview();
}

// ============================================================
//  ABRIR MODAL — Edição (abre em modo VISUALIZAÇÃO)
// ============================================================
async function abrirModalEditarCupom(id, nomeEstab, estabelecimentoId) {
  const token = localStorage.getItem("token");

  mostrarLoader("Carregando cupom...", "Buscando informações do cupom");

  try {
    const res = await fetch(`${API_BASE}/api/Cupons/${id}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) {
      ocultarLoader();
      alert("Erro ao carregar dados do cupom.");
      return;
    }

    const cupom   = await res.json();
    _cupomAtual   = cupom;
    window._cupomEditando = cupom;

    mostrarLoader("Carregando cupom...", "Carregando cartões e estabelecimentos...");

    await Promise.all([
      cpPopularCartoes(),
      cpPopularEstabelecimentos()
    ]);

    _marcarCartoesDoCupom(cupom);

    _popularVerValuesCupom(cupom);
    _preencherInputsCupom(cupom, nomeEstab);

    // Separa imagens por tipo
    cpImgGaleriaUrl = null;
    cpImgModalUrl   = null;
    const imagens = cupom.imagens || [];

    const imgGaleria = imagens.find(img => img.imagemTipoId === 1);
    const imgModal = imagens.find(img => img.imagemTipoId === 2 || img.imagemTipoId === 3);

    // Imagem galeria (card)
    if (imgGaleria?.url) {
      cpImgGaleriaUrl = imgGaleria.url;
      document.getElementById("cpv-card-img").src = imgGaleria.url;
      document.getElementById("cp-thumb-galeria").innerHTML =
        `<img src="${imgGaleria.url}" alt="preview">`;
    }

    // Imagem modal
    if (imgModal?.url) {
      cpImgModalUrl = imgModal.url;
      document.getElementById("cpv-modal-img").src = imgModal.url;
      document.getElementById("cp-thumb-modal").innerHTML =
        `<img src="${imgModal.url}" alt="preview">`;
    }

    document.getElementById("cp-form-titulo").textContent = cupom.titulo || "Ver Cupom";
    _setCupomModoVisualizacao();

    ocultarLoader();

    const modal = document.getElementById("modal-preview-cupom");
    modal.style.display = "flex";
    setTimeout(() => {
      modal.classList.add("active");
      sincronizarCupomPreview();
    }, 10);

  } catch (err) {
    console.error("Erro ao carregar cupom:", err);
    ocultarLoader();
    alert("Erro ao carregar dados do cupom.");
  }
}

// ============================================================
//  FECHAR MODAL
// ============================================================
function fecharPreviewCupom() {
  const modal = document.getElementById("modal-preview-cupom");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.style.display = "none";
    _resetarFormCupom();
    _cupomAtual      = null;
    _modoEdicaoCupom = false;
    fecharModalCupomPreview();
    document.querySelector('[data-open-subpage="lista-cupom"]').classList.add("active")
    document.querySelector('[data-subpage="lista-cupom"]').classList.add("active")
    document.querySelector('[data-open-subpage="criar-cupom"]').classList.remove("active")


  }, 300);


}

function fecharModalEditarCupom() { fecharPreviewCupom(); }

// ============================================================
//  POPULAR VER-VALUES (modo visualização)
// ============================================================
function _popularVerValuesCupom(cupom) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined && val !== "") ? val : "—";
  };

  set("vv-cp-codigo",             cupom.codigo);
  set("vv-cp-titulo",             cupom.titulo);
  set("vv-cp-modalTitulo",        cupom.modalTitulo);
  set("vv-cp-descricao",          cupom.descricao);
  set("vv-cp-modalDescricao",     cupom.modalDescricao);
  set("vv-cp-valorDesconto",      cupom.valorDesconto != null ? `${cupom.valorDesconto}%` : "—");
  set("vv-cp-valorMinimoCompra",  cupom.valorMinimoCompra != null ? `R$ ${parseFloat(cupom.valorMinimoCompra).toFixed(2)}` : "—");
  set("vv-cp-limiteUso",          cupom.limiteUso);
  set("vv-cp-limiteUsoPorUsuario",cupom.limiteUsoPorUsuario);
  set("vv-cp-ativo",              cupom.ativo ? "✅ Sim" : "❌ Não");

  // Datas formatadas
  set("vv-cp-dataInicio",    cupom.dataInicio    ? new Date(cupom.dataInicio).toLocaleString("pt-BR")    : "—");
  set("vv-cp-dataExpiracao", cupom.dataExpiracao ? new Date(cupom.dataExpiracao).toLocaleString("pt-BR") : "—");

  // Estabelecimento
  set("vv-cp-estab", cupom.nomeEstabelecimento || cupom.estabelecimento?.nome || "—");

  // Badges de status
  const badgeStatus = document.getElementById("cp-badge-status");
  badgeStatus.textContent = cupom.status || "Rascunho";
  badgeStatus.className   = "badge-pub " + (cupom.status === "Publicado" ? "pub-publicado" : "pub-rascunho");

  const badgeAtivo = document.getElementById("cp-badge-ativo");
  badgeAtivo.textContent = cupom.ativo ? "Ativo" : "Inativo";
  badgeAtivo.className   = "badge-op " + (cupom.ativo ? "status-op-ativo" : "status-op-pausado");

  // Cartões — badges no ver-value
  const vvCartoes = document.getElementById("vv-cp-cartoes");
  const cartoes   = cupom.cartoesAceitos || [];
  vvCartoes.innerHTML = cartoes.length > 0
    ? cartoes.map(c => `<span class="categoria-badge">${c.nome || c}</span>`).join("")
    : '<span style="color:#999;">Nenhum</span>';
}

// ============================================================
//  PREENCHER INPUTS (preparar para modo edição)
// ============================================================
function _preencherInputsCupom(cupom, nomeEstab) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? "";
  };

  set("cp-codigo",            cupom.codigo);
  set("cp-titulo",            cupom.titulo);
  set("cp-modalTitulo",       cupom.modalTitulo);
  set("cp-descricao",         cupom.descricao);
  set("cp-modalDescricao",    cupom.modalDescricao);
  set("cp-valorDesconto",     cupom.valorDesconto);
  set("cp-valorMinimoCompra", cupom.valorMinimoCompra);
  set("cp-limiteUso",         cupom.limiteUso);
  set("cp-limiteUsoPorUsuario", cupom.limiteUsoPorUsuario);

  // Datas
  if (cupom.dataInicio)    document.getElementById("cp-dataInicio").value    = _toDatetimeLocal(new Date(cupom.dataInicio));
  if (cupom.dataExpiracao) document.getElementById("cp-dataExpiracao").value = _toDatetimeLocal(new Date(cupom.dataExpiracao));

  // Checkbox ativo
  const elAtivo = document.getElementById("cp-ativo");
  if (elAtivo) elAtivo.checked = cupom.ativo ?? true;

  // Estabelecimento — marca o checkbox após render
  setTimeout(() => {
    document.querySelectorAll("#cp-estab-container input[type='checkbox']").forEach(cb => {
      const estabId = parseInt(cb.value);
      const deveMarcar = cupom.estabelecimentoIds
        ? cupom.estabelecimentoIds.includes(estabId)
        : (cupom.estabelecimentoId && estabId === parseInt(cupom.estabelecimentoId));
      cb.checked = deveMarcar;

      // Fallback pelo nome
      if (!cb.checked && nomeEstab) {
        const nomeCb = cb.dataset.nome || "";
        if (nomeCb === nomeEstab) cb.checked = true;
      }
    });
  }, 100);

  // Cartões — marca checkboxes
  setTimeout(() => {
    const idsCartoes = (cupom.cartoesAceitos || []).map(c => c.id);
    document.querySelectorAll("#cp-cards-row-preview input[type='checkbox']").forEach(cb => {
      cb.checked = idsCartoes.includes(parseInt(cb.dataset.id));
    });
    sincronizarCupomPreview();
  }, 150);
}

function _toDatetimeLocal(date) {
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ============================================================
//  RESETAR FORMULÁRIO
// ============================================================
function _resetarFormCupom() {
  const form = document.getElementById("formCupomPreview");
  if (form) form.reset();

  cpImgGaleriaUrl = null;
  cpImgModalUrl   = null;

  const thumbG = document.getElementById("cp-thumb-galeria");
  const thumbM = document.getElementById("cp-thumb-modal");
  if (thumbG) thumbG.innerHTML = "";
  if (thumbM) thumbM.innerHTML = "";

  document.getElementById("cpv-card-img").src  = "./imgs/default-image.png";
  document.getElementById("cpv-modal-img").src = "./imgs/default-image.png";

  document.querySelectorAll("#cp-cards-row-preview input[type='checkbox']").forEach(cb => cb.checked = false);
  document.querySelectorAll("#cp-estab-container input[type='checkbox']").forEach(cb => cb.checked = false);

  // Limpa ver-values
  document.querySelectorAll("#formCupomPreview .ver-value").forEach(el => el.textContent = "—");
  document.getElementById("vv-cp-cartoes").innerHTML = '<span style="color:#999;">Nenhum</span>';

  sincronizarCupomPreview();
}

// ============================================================
//  SALVAR EDIÇÃO
// ============================================================
async function salvarEdicaoCupom() {
  const token = localStorage.getItem("token");
  if (!_cupomAtual) { alert("Erro: cupom não encontrado."); return; }

  try {
    const id                  = _cupomAtual.id;
    const codigo              = document.getElementById("cp-codigo").value;
    const titulo              = document.getElementById("cp-titulo").value;
    const descricao           = document.getElementById("cp-descricao").value;
    const tag                 = document.getElementById("cp-tagCupom").value;
    const modalTitulo         = document.getElementById("cp-modalTitulo").value;
    const modalDescricao      = document.getElementById("cp-modalDescricao").value;
    const valorDesconto       = parseFloat(document.getElementById("cp-valorDesconto").value)       || 0;
    const valorMinimoCompra   = parseFloat(document.getElementById("cp-valorMinimoCompra").value)   || 0;
    const limiteUso           = parseInt(document.getElementById("cp-limiteUso").value)             || 0;
    const limiteUsoPorUsuario = parseInt(document.getElementById("cp-limiteUsoPorUsuario").value)   || 0;
    const ativo               = document.getElementById("cp-ativo").checked;

    const dataInicio       = document.getElementById("cp-dataInicio").value;
    const dataExpiracao    = document.getElementById("cp-dataExpiracao").value;
    const dataInicioISO    = dataInicio    ? new Date(dataInicio).toISOString()    : new Date().toISOString();
    const dataExpiracaoISO = dataExpiracao ? new Date(dataExpiracao).toISOString() : new Date().toISOString();

    const estabChecked = document.querySelector("#cp-estab-container input[type='checkbox']:checked");
    const estabelecimentoId = estabChecked
      ? parseInt(estabChecked.value)
      : parseInt(_cupomAtual.estabelecimentoId);

    const cartoesSelecionados = Array.from(
      document.querySelectorAll("#cp-cards-row-preview input[type='checkbox']:checked")
    ).map(cb => parseInt(cb.dataset.id));

    const body = {
      codigo, titulo, descricao, tag, modalTitulo, modalDescricao,
      tipo: _cupomAtual.tipo || "",
      valorDesconto, valorMinimoCompra,
      dataInicio: dataInicioISO,
      dataExpiracao: dataExpiracaoISO,
      limiteUso, limiteUsoPorUsuario, ativo,
      estabelecimentoId,
      cartoesAceitosIds: cartoesSelecionados,
      status: ativo ? "Publicado" : "Rascunho"
    };

    const res = await fetch(`${API_BASE}/api/Cupons/${id}`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(await res.text());

    alert("Cupom atualizado com sucesso!");

    const modal = document.getElementById("modal-preview-cupom");
    modal.classList.remove("active");
    modal.style.display = "none";
    _cupomAtual      = null;
    _modoEdicaoCupom = false;
    fecharModalCupomPreview();

    window._cuponsPromocoes = null;
    window._cuponsCacheMap  = null;
    localStorage.removeItem("cache_cupons_promocoes");

    await carregarCuponsPromocoes();

  } catch (err) {
    console.error("Erro ao salvar cupom:", err);
    alert("Erro ao salvar cupom: " + err.message);
  }
}

function _ligarPreviewReativoCupom() {
  const ids = [
    "cp-titulo", "cp-descricao", "cp-modalTitulo", "cp-modalDescricao",
    "cp-valorDesconto", "cp-dataExpiracao", "cp-ativo", "cp-tagCupom"
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.removeEventListener("input",  sincronizarCupomPreview);
    el.removeEventListener("change", sincronizarCupomPreview);
    el.addEventListener("input",  sincronizarCupomPreview);
    el.addEventListener("change", sincronizarCupomPreview);
  });
}

function _marcarCartoesDoCupom(cupom) {
  const cartoesCupom = cupom.cartoesAceitos || [];

  const idsSelecionados = cartoesCupom.map(c => c.id);

  const inputs = document.querySelectorAll('#cp-cards-row-preview input[type="checkbox"]');

  inputs.forEach(input => {
    const id = Number(input.dataset.id);
    input.checked = idsSelecionados.includes(id);
  });

  sincronizarCupomPreview();
}

function sincronizarCupomPreview() {
  const emEdicao = _modoEdicaoCupom || _cupomAtual === null;

  const titulo         = emEdicao
    ? (document.getElementById("cp-titulo")?.value.trim()         || "Título do cupom")
    : (document.getElementById("vv-cp-titulo")?.textContent       || "Título do cupom");

  const descricao      = emEdicao
    ? (document.getElementById("cp-descricao")?.value.trim()      || "Descrição do cupom aparece aqui")
    : (document.getElementById("vv-cp-descricao")?.textContent    || "Descrição do cupom aparece aqui");

  const modalTitulo    = emEdicao
    ? (document.getElementById("cp-modalTitulo")?.value.trim()    || "Título do Modal")
    : (document.getElementById("vv-cp-modalTitulo")?.textContent  || "Título do Modal");

  const modalDescricao = emEdicao
    ? (document.getElementById("cp-modalDescricao")?.value.trim() || "Descrição modal aparece aqui")
    : (document.getElementById("vv-cp-modalDescricao")?.textContent || "Descrição modal aparece aqui");

  const valorDesconto  = emEdicao
    ? document.getElementById("cp-valorDesconto")?.value.trim()
    : (_cupomAtual?.valorDesconto ?? "");

  const dataExpiracao  = emEdicao
    ? document.getElementById("cp-dataExpiracao")?.value
    : (_cupomAtual?.dataExpiracao ?? "");

  const tag = emEdicao
    ? (document.getElementById("cp-tagCupom")?.value.trim() || "Tag de Desconto")
    : (_cupomAtual?.tag ?? "Tag de Desconto");

  const dataFormatada = cpFormatarData(dataExpiracao);

  // Atualiza card
  document.getElementById("cpv-badge-titulo").textContent =
    tag;
  document.getElementById("cpv-titulo").textContent    = titulo;
  document.getElementById("cpv-descricao").textContent = descricao;
  document.getElementById("cpv-validade").textContent  = dataFormatada;

  // Atualiza tag no preview (se existir o elemento)
  const cpvMetaCat = document.getElementById("cpv-meta-cat");
  if (cpvMetaCat) cpvMetaCat.textContent = "Categoria";

  // Atualiza modal
  document.getElementById("cpv-modal-titulo").textContent    = modalTitulo;
  document.getElementById("cpv-modal-descricao").textContent = modalDescricao;
  document.getElementById("cpv-modal-chip-validade").innerHTML =
    `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg> Válido até ${dataFormatada}`;
  document.getElementById("cpv-modal-validade-texto").textContent = dataFormatada;

  cpAtualizarPillsPreview();
}

// ============================================================
//  POPULAR CARTÕES
// ============================================================
async function cpPopularCartoes() {
  const container = document.getElementById("cp-cards-row-preview");
  if (!container) return;

  container.innerHTML = ""; // 🔥 limpa antes

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/Cartoes`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    const cartoes = await res.json();

    cartoes.forEach(cartao => {
      const label = document.createElement("label");
      label.className = "field-ratio";

      const input = document.createElement("input");
      input.type         = "checkbox";
      input.id           = `cp-cartao-${cartao.id}`;
      input.dataset.id   = cartao.id;
      input.dataset.nome = cartao.nome;
      input.addEventListener("change", sincronizarCupomPreview);

      const span = document.createElement("span");
      span.textContent = cartao.nome;

      label.appendChild(input);
      label.appendChild(span);
      container.appendChild(label);
    });
  } catch (err) {
    console.error("Erro ao carregar cartões:", err);
  }
}

// ============================================================
//  POPULAR ESTABELECIMENTOS
// ============================================================
async function cpPopularEstabelecimentos() {
  const container = document.getElementById("cp-estab-container");
  if (!container) return;
  if (container.children.length > 0 &&
      !container.querySelector(".carregando-estabelecimentos")) return;

  container.innerHTML = '<p class="carregando-estabelecimentos">Carregando...</p>';

  if (!window.estabelecimentosCache || estabelecimentosCache.length === 0) {
    const token = localStorage.getItem("token");
    if (!token) { container.innerHTML = ""; return; }
    try {
      const res = await fetch(`${API_BASE}/api/Estabelecimentos`, {
        headers: { Authorization: "Bearer " + token }
      });
      if (!res.ok) throw new Error();
      estabelecimentosCache = await res.json();
    } catch {
      container.innerHTML = "";
      return;
    }
  }

  container.innerHTML = "";
  estabelecimentosCache.forEach(estab => {
    const label = document.createElement("label");
    label.className = "field-ratio";
    label.innerHTML = `
      <input type="checkbox" name="estabelecimentos[]"
             value="${estab.id}"
             data-nome="${estab.nomeFantasia || estab.nome}">
      <span>${estab.nomeFantasia || estab.nome}</span>
    `;
    container.appendChild(label);
  });
}

// ============================================================
//  UTILITÁRIOS
// ============================================================

function cpFormatarData(dtString) {
  if (!dtString) return "--/--/----";
  const d = new Date(dtString);
  if (isNaN(d)) return "--/--/----";
  return d.toLocaleDateString("pt-BR");
}

async function cpPreviewImagem(input, tipo) {
  const file = input.files[0];
  if (!file) return;

  // imagemTipoId: 1 = Galeria (card), 2 = Modal
  const imagemTipoId = tipo === "galeria" ? 1 : 2;

  // Atualiza preview local imediatamente
  const reader = new FileReader();
  reader.onload = (e) => {
    const url = e.target.result;
    if (tipo === "galeria") {
      cpImgGaleriaUrl = url;
      document.getElementById("cpv-card-img").src = url;
      document.getElementById("cp-thumb-galeria").innerHTML = `<img src="${url}" alt="preview">`;
    } else {
      cpImgModalUrl = url;
      document.getElementById("cpv-modal-img").src = url;
      document.getElementById("cp-thumb-modal").innerHTML = `<img src="${url}" alt="preview">`;
    }
  };
  reader.readAsDataURL(file);

  // Se está editando um cupom existente, envia para a API
  if (_cupomAtual?.id) {
    try {
      const imagens = _cupomAtual?.imagens || [];
      const imagemExistente = imagens.find(img => img.imagemTipoId === imagemTipoId);
      const imagemId = imagemExistente?.id || null;

      if (imagemId) {
        // Substitui a imagem existente do mesmo tipo
        await substituirImagemCupom(
          { target: { files: [file], value: "" } },
          _cupomAtual.id,
          imagemId
        );
      } else {
        // Adiciona nova imagem com o tipo correto
        await adicionarImagemNovaCupom(
          { target: { files: [file], value: "" } },
          _cupomAtual.id,
          imagemTipoId
        );
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    } finally {
      input.value = "";
    }
  }
}

function cpAtualizarPillsPreview() {
  const cores = {
    "Vegas Alimentação": { bg: "#d4f5d4", color: "#1a7a1a" },
    "Vegas Refeição":    { bg: "#d4e8ff", color: "#1a4fa0" },
    "Vegas Day":         { bg: "#ffe4d4", color: "#a04a1a" },
    "Vegas Farmácia":    { bg: "#f5d4f5", color: "#7a1a7a" },
    "Vegas Plus":        { bg: "#fff3d4", color: "#8a6000" },
    "Vegas Pay":         { bg: "#d4fff5", color: "#007a5a" },
  };

  const checkboxes = document.querySelectorAll("#cp-cards-row-preview input[type='checkbox']");
  let pillsCard = "", pillsModal = "", count = 0;

  checkboxes.forEach(cb => {
    if (cb.checked) {
      const nome = cb.dataset.nome || cb.value;
      const cor  = cores[nome] || { bg: "#e8eaf6", color: "#434D9C" };
      if (count < 2) {
        pillsCard += `<span class="pill" style="background:${cor.bg};color:${cor.color};">${nome.replace("Vegas ", "")}</span>`;
      }
      pillsModal += `<span class="pill" style="background:${cor.bg};color:${cor.color};padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;">${nome.replace("Vegas ", "")}</span>`;
      count++;
    }
  });

  // Em modo visualização sem edição, usa os cartões do objeto
  if (!_modoEdicaoCupom && _cupomAtual && count === 0) {
    (_cupomAtual.cartoesAceitos || []).forEach((c, i) => {
      const nome = c.nome || c;
      const cor  = cores[nome] || { bg: "#e8eaf6", color: "#434D9C" };
      if (i < 2) pillsCard  += `<span class="pill" style="background:${cor.bg};color:${cor.color};">${nome.replace("Vegas ", "")}</span>`;
      pillsModal += `<span class="pill" style="background:${cor.bg};color:${cor.color};padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;">${nome.replace("Vegas ", "")}</span>`;
    });
  }

  document.getElementById("cpv-meta-pills").innerHTML  = pillsCard  || '<span class="pill pill-alt">Cartão</span>';
  document.getElementById("cpv-modal-pills").innerHTML = pillsModal || '<span style="color:#888;font-size:13px;">Nenhum selecionado</span>';
}

function abrirModalCupomPreview()  { 

  document.getElementById("cpv-modal-wrap").style.display = "flex"; 
}
function fecharModalCupomPreview() { document.getElementById("cpv-modal-wrap").style.display = "none"; }






carregarCuponsPromocoes();

// ===================== CUPOM =====================
window.cadastrarCupom = cadastrarCupom;
window.ativarModoEdicaoCupom = ativarModoEdicaoCupom;
window.salvarEdicaoCupom = salvarEdicaoCupom;
window.fecharModalEditarCupom = fecharModalEditarCupom;
window.abrirModalCupomPreview = abrirModalCupomPreview;
window.cpPreviewImagem = cpPreviewImagem;
window.substituirImagemCupom = substituirImagemCupom;
window.adicionarImagemNovaCupom = adicionarImagemNovaCupom;
window.excluirImagemCupom = excluirImagemCupom;
window.abrirPreviewCupom = abrirPreviewCupom;
window.fecharPreviewCupom = fecharPreviewCupom;
window.limparFiltrosCupons = limparFiltrosCupons;
window.renderizarCheckboxesEstabelecimentos = renderizarCheckboxesEstabelecimentos;

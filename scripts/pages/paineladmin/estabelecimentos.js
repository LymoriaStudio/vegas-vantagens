import {popularSelectGrupos, gruposCache} from './grupos.js'
import {inicializarDashboardGraficos} from './grafico.js'
import {mostrarLoader, ocultarLoader} from '../../utils/loader.js'
import { API_BASE } from '../../auth.js'


// estabelecimentos.js
export const estabelecimentosCache = []; // const, não let



export async function buscarEstabelecimentos(forcarRecarregar = false) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Você precisa estar logado.");
    return [];
  }

  // 🔥 1. carregar cache do localStorage se memória estiver vazia
  if (estabelecimentosCache.length === 0) {
    const cacheLocal = localStorage.getItem("estabelecimentosCache");
    const cacheTime = localStorage.getItem("estabelecimentosCacheTime");
    const cacheExpirado = !cacheTime || (Date.now() - Number(cacheTime)) > 5 * 60 * 1000;

    if (cacheLocal && !cacheExpirado) {
      try {
        const dados = JSON.parse(cacheLocal);
        estabelecimentosCache.length = 0;
        estabelecimentosCache.push(...dados);
        console.log("Estabelecimentos carregados do localStorage");
      } catch (e) {
        console.warn("Erro ao parsear cache local", e);
        localStorage.removeItem("estabelecimentosCache");
        localStorage.removeItem("estabelecimentosCacheTime");
      }
    }
  }

  // 🔥 2. usar cache (se não forçar recarregar)
  if (estabelecimentosCache.length > 0 && !forcarRecarregar) {
    console.log("Usando estabelecimentos do cache");
    renderizarLista(estabelecimentosCache, "listaCards");
    inicializarFiltroDashboard();
    inicializarDashboardGraficos();
    return estabelecimentosCache;
  }

  try {
    console.log("Buscando estabelecimentos da API...");

    const res = await fetch(`${API_BASE}/api/Estabelecimentos`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!res.ok) throw new Error("Erro ao buscar estabelecimentos");

    const data = await res.json();

    const detalhes = await Promise.all(
      data.map(e =>
        fetch(`${API_BASE}/api/Estabelecimentos/${e.id}`, {
          headers: { Authorization: "Bearer " + token }
        })
          .then(r => (r.ok ? r.json() : null))
          .catch(() => null)
      )
    );

    const estabelecimentosValidos = detalhes.filter(Boolean);

    // 🔥 atualiza cache memória (mutação, não reatribuição)
    estabelecimentosCache.length = 0;
    estabelecimentosCache.push(...estabelecimentosValidos);

    // 🔥 salva no localStorage com timestamp
    localStorage.setItem("estabelecimentosCache", JSON.stringify(estabelecimentosValidos));
    localStorage.setItem("estabelecimentosCacheTime", Date.now());

    console.log(`${estabelecimentosValidos.length} estabelecimentos carregados`);

    renderizarLista(estabelecimentosCache, "listaCards");
    inicializarFiltroDashboard();
    inicializarDashboardGraficos();

    return estabelecimentosCache;

  } catch (err) {
    console.error("Erro ao carregar estabelecimentos:", err);

    if (estabelecimentosCache.length > 0) {
      console.warn("Usando cache em memória");
      renderizarLista(estabelecimentosCache, "listaCards");
      inicializarFiltroDashboard();
      inicializarDashboardGraficos();
      return estabelecimentosCache;
    }

    const cacheLocal = localStorage.getItem("estabelecimentosCache");
    if (cacheLocal) {
      try {
        const dados = JSON.parse(cacheLocal);
        estabelecimentosCache.length = 0;
        estabelecimentosCache.push(...dados);
        console.warn("Usando cache do localStorage");
        renderizarLista(estabelecimentosCache, "listaCards");
        inicializarFiltroDashboard();
        inicializarDashboardGraficos();
        return estabelecimentosCache;
      } catch {}
    }

    alert("Erro ao carregar estabelecimentos");
    return [];
  }
}

 function carregarCategorias() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado para carregar as categorias.");
    return;
  }

  fetch(`${API_BASE}/api/CategoriasEstabelecimentos`, {
    headers: {
      "Authorization": "Bearer " + token
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao buscar categorias: " + res.status);
    return res.json();
  })
  .then(data => {
    const select = document.getElementById("categoriaId2");
    select.innerHTML = "";

    data.forEach(categoria => {
      const option = document.createElement("option");
      option.value = categoria.id;
      option.textContent = categoria.nome;
      select.appendChild(option);
    });
  })
  .catch(err => {
    alert("Erro ao carregar categorias: " + err.message);
    console.error(err);
  });
}

window.onload = async () => {
  carregarCategorias();
  await carregarEstados();
  carregarCartoes();
};



  // 🔹 IMPORTANTE: Chamar apenas UMA VEZ quando abrir a subpage
document.addEventListener('DOMContentLoaded', () => {
  const btnListaEstab = document.querySelector('[data-open-subpage="lista-estab"]');
  
  if (btnListaEstab) {
    btnListaEstab.addEventListener('click', () => {
      // Pequeno delay para garantir que o DOM está pronto
      setTimeout(() => {
        inicializarPaginaEstabelecimentos();
      }, 100);
    });
  }

    const form = document.getElementById('formCadastro2');

  // Atualiza preview sempre que qualquer campo mudar
  form.addEventListener('input', atualizarPreview);
  form.addEventListener('change', atualizarPreview);

  // Executa uma vez ao abrir
  atualizarPreview();
});

  function filtrarEstabelecimentos(texto) {
    const containerId = "listaCards";

    if (!texto || texto.trim() === "") {
      renderizarLista(estabelecimentosCache, containerId);
      return;
    }

    const termo = texto.toLowerCase();

    const filtrados = estabelecimentosCache.filter(estab =>
      estab.nome?.toLowerCase().includes(termo) ||
      estab.cidade?.toLowerCase().includes(termo) ||
      estab.status?.toLowerCase().includes(termo)
    );

    renderizarLista(filtrados, containerId);
  }

function inicializarBuscaEstabelecimentos() {
  const input = document.querySelector(".search-estab");
  if (!input) return;

  input.addEventListener("input", e => {
    filtrarEstabelecimentos(e.target.value);
  });
}

document.querySelector(".search-estab").addEventListener("input", e => {
    filtrarEstabelecimentos(e.target.value);
  });


//CARTOES ACEITOS

export async function carregarCartoes() {
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

    console.log(cartoes)
    const container = document.querySelector(".cards-row");

    container.innerHTML = "";

    cartoes.forEach(cartao => {
      const label = document.createElement("label");
      label.className = "field-ratio";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = cartao.id;

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


 inicializarPaginaEstabelecimentos();

function renderizarLista(lista, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum estabelecimento.</p>";
    return;
  }

  lista.forEach(estab => {
    const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

    let imagemSrc = PLACEHOLDER;
    if (estab.imagemPrincipal) {
      imagemSrc = estab.imagemPrincipal;
    } else if (estab.imagens && estab.imagens.length > 0) {
      const fachada = estab.imagens.find(i => i.fachada);
      const logo    = estab.imagens.find(i => i.logo);
      if (fachada?.url)     imagemSrc = fachada.url;
      else if (logo?.url)   imagemSrc = logo.url;
    }

    // Categorias
    let categoriasHTML = '';
    if (estab.categorias?.length > 0) {
      categoriasHTML = estab.categorias.map(cat =>
        `<span class="categoria-badge">${cat}</span>`
      ).join('');
    }

    // Badge status operacional
    const statusOpClass = {
      "Ativo":     "status-op-ativo",
      "Pausado":   "status-op-pausado",
      "Cancelado": "status-op-cancelado"
    }[estab.statusOperacional] || "status-op-ativo";

    const statusOpLabel = estab.statusOperacional || "Ativo";
    const isPublicado   = estab.statusPublicacao === "Publicado";

    const cardHTML = `
      <div class="card-estab-novo" data-id="${estab.id}" style="cursor:pointer;" title="Clique para ver detalhes">
        <div class="card-img-container">
          <img src="${imagemSrc}" alt="${estab.nome}"
               onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        </div>

        <div class="info-wrapper">
          <div class="card-info-container">
            <div class="header-info-container">
              <div class="header-info-names">
                <h3 class="card-titulo">${estab.nome}</h3>
                <p class="card-localizacao">${estab.cidade || ""} - ${estab.unidadeFederativa || "SP"}</p>
              </div>

              <div class="toggle-container">
                <label class="switch-card" title="Publicação: ${isPublicado ? 'Publicado' : 'Rascunho'}">
                  <input type="checkbox" id="toggle-pub-${estab.id}"
                    ${isPublicado ? "checked" : ""} data-estab-id="${estab.id}">
                  <span class="slider-card"></span>
                </label>
                <span class="status-op-badge ${statusOpClass}">${statusOpLabel}</span>
              </div>
            </div>
          </div>

          <div class="card-acoes-container">
            <div class="card-categorias">
              ${categoriasHTML}
            </div>
            <div class="botoes-acoes">
              <button class="btn-acao btn-editar" data-action="editar" title="Ver / Editar">
                <img src="./imgs/icons/edit-e.svg" alt="Editar">
              </button>
             
            </div>
          </div>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', cardHTML);

    const card = container.lastElementChild;

    // ── Clique no card (qualquer área exceto botões e toggle) abre o modal ver ──
    card.addEventListener("click", (e) => {
      // Ignora cliques nos botões de ação e no toggle de publicação
      if (
        e.target.closest("[data-action]") ||
        e.target.closest(".switch-card") ||
        e.target.closest("input[type='checkbox']")
      ) return;
      abrirModalEditar(estab);
    });

    // ── Toggle: altera statusPublicacao ───────────────────────────────────────
    const togglePub = card.querySelector(`#toggle-pub-${estab.id}`);
    togglePub.addEventListener("change", async (e) => {
      e.stopPropagation();
      const isChecked           = e.target.checked;
      const estabelecimentoId   = e.target.dataset.estabId;
      const novoStatusPublicacao = isChecked ? "Publicado" : "Rascunho";

      try {
        await atualizarStatusEstabelecimentoPatch(
          estabelecimentoId,
          novoStatusPublicacao,
          estab.statusOperacional || "Ativo"
        );

        estab.statusPublicacao = novoStatusPublicacao;

        const index = estabelecimentosCache.findIndex(e => e.id === estab.id);
        if (index !== -1) estabelecimentosCache[index].statusPublicacao = novoStatusPublicacao;

        togglePub.closest('label').title = `Publicação: ${novoStatusPublicacao}`;
        console.log(`✅ statusPublicacao → ${novoStatusPublicacao}`);

        if (typeof _atualizarContadores === 'function') _atualizarContadores();

      } catch (err) {
        console.error("❌ Erro ao alterar statusPublicacao:", err);
        alert("Erro ao alterar status de publicação: " + err.message);
        e.target.checked = !isChecked;
      }
    });

    // ── Botão editar ──────────────────────────────────────────────────────────
    card.querySelector('[data-action="editar"]').addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModalEditar(estab);
    });

  
  });
}

async function excluirEstabDoModal() {
  if (!_estabAtual) return;
  if (!confirm(`Tem certeza que deseja excluir "${_estabAtual.nome}"?`)) return;

  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API_BASE}/api/Estabelecimentos/${_estabAtual.id}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer " + token }
    });

    if (!res.ok) throw new Error("Erro ao excluir");

    // Remove do cache e do DOM
    const index = estabelecimentosCache.findIndex(e => e.id === _estabAtual.id);
    if (index > -1) estabelecimentosCache.splice(index, 1);

    const card = document.querySelector(`.card-estab-novo[data-id="${_estabAtual.id}"]`);
    if (card) card.remove();

    alert("Estabelecimento excluído com sucesso!");
    fecharVerEstab();

    if (typeof _atualizarContadores === 'function') _atualizarContadores();
    if (typeof inicializarFiltros    === 'function') inicializarFiltros();

  } catch (err) {
    console.error(err);
    alert("Erro ao excluir o estabelecimento.");
  }
}

// ========== PATCH STATUS — mesmo endpoint /status, envia ambos os campos ==========
async function atualizarStatusEstabelecimentoPatch(estabelecimentoId, statusPublicacao, statusOperacional) {
  const token = localStorage.getItem("token");

  if (!token) throw new Error("Token não encontrado");

  console.log(`🔄 Atualizando status do estabelecimento ${estabelecimentoId}:`, { statusPublicacao, statusOperacional });

  const response = await fetch(`${API_BASE}/api/Estabelecimentos/${estabelecimentoId}/status`, {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ statusPublicacao, statusOperacional })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro na resposta:", errorText);
    throw new Error(`Erro ao atualizar status: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    console.log("✅ Resposta do servidor:", data);
    return data;
  }

  console.log("✅ Status atualizado com sucesso");
  return null;
}


 // ========== FUNÇÕES ESPECÍFICAS ADAPTADAS ==========

// Chame isso quando carregar a página de estabelecimentos
async function inicializarPaginaEstabelecimentos() {
  await buscarEstabelecimentos(); // sua função existente
  await popularFiltros();
  inicializarFiltrosEstabelecimentos();
  aplicarFiltros();
}

// Event listener para quando abrir a subpage de lista de estabelecimentos
document.querySelector('.page[data-page="estabelecimentos"] [data-open-subpage="lista-estab"]')
  ?.addEventListener('click', () => {
    inicializarPaginaEstabelecimentos();
  });

// Função específica para voltar aos estabelecimentos
function voltarEstabelecimentos() {
  if (gerenciadores.estabelecimentos) {
    gerenciadores.estabelecimentos.voltarPara("lista-estab");
  }
}

var filtrosAtivos = {
  busca: "",
  status: "todos",
  statusOperacional: "Todos",
  cidade: "Todos",
  categoria: "Todos",
  grupo: "Todos"
};

// ========== FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO ==========
function inicializarFiltros() {
  console.log("🚀 INICIANDO FILTROS...");

  // Listeners sempre registrados — só dependem do DOM
  _configurarEventListeners();

  // O restante depende dos dados da API
  if (!window.estabelecimentosCache || !Array.isArray(estabelecimentosCache) || estabelecimentosCache.length === 0) {
    console.warn("⚠️ Cache vazio — listeners registrados, aguardando dados.");
    return;
  }

  console.log(`✅ ${estabelecimentosCache.length} estabelecimentos encontrados`);

  _popularFiltroCidades();
  _popularFiltroCategorias();
  _popularFiltroGrupos();

  _atualizarContadores();
  aplicarFiltros();

  console.log("✅ FILTROS INICIALIZADOS COM SUCESSO!");
}

// ========== POPULAR CIDADES ==========
function _popularFiltroCidades() {
  console.log("📍 Populando cidades...");
  
  const select = document.getElementById("filtroCidade");
  if (!select) {
    console.error("❌ Select filtroCidade não encontrado!");
    return;
  }
  
  // Limpa o select
  select.innerHTML = '<option value="Todos">Todas</option>';
  
  // Extrai cidades únicas
  const cidadesSet = new Set();
  estabelecimentosCache.forEach(estab => {
    if (estab.cidade && typeof estab.cidade === 'string' && estab.cidade.trim() !== '') {
      cidadesSet.add(estab.cidade.trim());
    }
  });
  
  const cidades = Array.from(cidadesSet).sort();
  console.log(`  Encontradas ${cidades.length} cidades:`, cidades);
  
  // Adiciona as opções
  cidades.forEach(cidade => {
    const option = document.createElement("option");
    option.value = cidade;
    option.textContent = cidade;
    select.appendChild(option);
  });
  
  console.log(`✅ ${cidades.length} cidades adicionadas ao select`);
}

// ========== POPULAR CATEGORIAS ==========
function _popularFiltroCategorias() {
  console.log("🏷️ Populando categorias...");
  
  const select = document.getElementById("filtroCategoria");
  if (!select) {
    console.error("❌ Select filtroCategoria não encontrado!");
    return;
  }
  
  // Limpa o select - CORRIGIDO: value="Todos"
  select.innerHTML = '<option value="Todos">Todas</option>';
  
  // Extrai categorias únicas
  const categoriasSet = new Set();
  estabelecimentosCache.forEach(estab => {
    if (estab.categorias && Array.isArray(estab.categorias)) {
      estab.categorias.forEach(cat => {
        if (cat && typeof cat === 'string' && cat.trim() !== '') {
          categoriasSet.add(cat.trim());
        }
      });
    }
  });
  
  const categorias = Array.from(categoriasSet).sort();
  console.log(`  Encontradas ${categorias.length} categorias:`, categorias);
  
  // Adiciona as opções
  categorias.forEach(categoria => {
    const option = document.createElement("option");
    option.value = categoria;
    option.textContent = categoria;
    select.appendChild(option);
  });
  
  console.log(`✅ ${categorias.length} categorias adicionadas ao select`);
}

// ========== POPULAR GRUPOS ==========
function _popularFiltroGrupos() {
  console.log("👥 Populando grupos...");
  
  const select = document.getElementById("filtroGrupo");
  if (!select) {
    console.error("❌ Select filtroGrupo não encontrado!");
    return;
  }
  
  // Limpa o select - CORRIGIDO: value="Todos"
  select.innerHTML = '<option value="Todos">Todos</option>';
  
  // Verifica se gruposCache existe
  if (!window.gruposCache || !Array.isArray(gruposCache)) {
    console.warn("⚠️ gruposCache não existe ou não é um array");
    return;
  }
  
  if (gruposCache.length === 0) {
    console.warn("⚠️ gruposCache está vazio");
    return;
  }
  
  console.log(`  Encontrados ${gruposCache.length} grupos:`, gruposCache);
  
  // Adiciona as opções
  gruposCache.forEach(grupo => {
    if (grupo && grupo.id && grupo.nome) {
      const option = document.createElement("option");
      option.value = grupo.id;
      option.textContent = grupo.nome;
      select.appendChild(option);
    }
  });
  
  console.log(`✅ ${gruposCache.length} grupos adicionados ao select`);
}

// ========== CONFIGURAR EVENT LISTENERS ==========
function _configurarEventListeners() {
  console.log("🎧 Configurando event listeners...");

   // Select Status Operacional
  const selectStatusOp = document.getElementById("filtroStatusOperacional");
  console.log(selectStatusOp, "componente dos status")
  if (selectStatusOp) {
    selectStatusOp.addEventListener("change", function(e) {
      filtrosAtivos.statusOperacional = e.target.value;
      console.log("⚙️ Status operacional selecionado:", e.target.value);
      aplicarFiltros();
    });
    console.log("  ✅ Select de status operacional configurado");
  } else {
    console.warn("  ⚠️ Select de status operacional não encontrado");
  }
  
  // Busca
  const inputBusca = document.querySelector(".search-estab");
  if (inputBusca) {
    inputBusca.addEventListener("input", function(e) {
      filtrosAtivos.busca = e.target.value;
      aplicarFiltros();
    });
    console.log("  ✅ Input de busca configurado");
  } else {
    console.warn("  ⚠️ Input de busca não encontrado");
  }
  
  // Tabs de status (statusPublicacao)
  const tabs = document.querySelectorAll(".tab-filtro");
  if (tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener("click", function(e) {
        tabs.forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        filtrosAtivos.status = this.getAttribute("data-status");
        aplicarFiltros();
      });
    });
    console.log(`  ✅ ${tabs.length} tabs configuradas`);
  } else {
    console.warn("  ⚠️ Tabs de status não encontradas");
  }
  
  // Select Cidade
  const selectCidade = document.getElementById("filtroCidade");
  if (selectCidade) {
    selectCidade.addEventListener("change", function(e) {
      filtrosAtivos.cidade = e.target.value;
      console.log("🏙️ Cidade selecionada:", e.target.value);
      aplicarFiltros();
    });
    console.log("  ✅ Select de cidade configurado");
  }
  
  // Select Categoria
  const selectCategoria = document.getElementById("filtroCategoria");
  if (selectCategoria) {
    selectCategoria.addEventListener("change", function(e) {
      filtrosAtivos.categoria = e.target.value;
      console.log("🏷️ Categoria selecionada:", e.target.value);
      aplicarFiltros();
    });
    console.log("  ✅ Select de categoria configurado");
  }
  
  // Select Grupo
  const selectGrupo = document.getElementById("filtroGrupo");
  if (selectGrupo) {
    selectGrupo.addEventListener("change", function(e) {
      filtrosAtivos.grupo = e.target.value;
      console.log("👥 Grupo selecionado:", e.target.value);
      aplicarFiltros();
    });
    console.log("  ✅ Select de grupo configurado");
  }

 
  
  console.log("✅ Event listeners configurados");
}

// ========== APLICAR FILTROS ==========

function aplicarFiltros() {
  console.log("🔍 Aplicando filtros...", filtrosAtivos);
  
  let resultado = [...estabelecimentosCache];
  
  // Filtro por busca
  if (filtrosAtivos.busca && filtrosAtivos.busca.trim() !== '') {
    const termo = filtrosAtivos.busca.toLowerCase().trim();
    resultado = resultado.filter(estab => {
      const nome = (estab.nome || '').toLowerCase();
      const cidade = (estab.cidade || '').toLowerCase();
      return nome.includes(termo) || cidade.includes(termo);
    });
    console.log(`  Após busca: ${resultado.length} resultados`);
  }
  
  // Filtro por statusPublicacao
  if (filtrosAtivos.status !== "todos") {
    const statusBusca = filtrosAtivos.status === "publicados" ? "Publicado" : "Rascunho";
    resultado = resultado.filter(estab => estab.statusPublicacao === statusBusca);
    console.log(`  Após statusPublicacao (${statusBusca}): ${resultado.length} resultados`);
  }

  // Filtro por statusOperacional
  // Filtro por statusOperacional
if (filtrosAtivos.statusOperacional && filtrosAtivos.statusOperacional !== "Todos") {
  console.log("🔎 Valores de statusOperacional no cache:", 
    estabelecimentosCache.map(e => ({ nome: e.nome, statusOperacional: e.statusOperacional }))
  );
  resultado = resultado.filter(estab => estab.statusOperacional === filtrosAtivos.statusOperacional);
  console.log(`  Após statusOperacional (${filtrosAtivos.statusOperacional}): ${resultado.length} resultados`);
}
  
  // Filtro por cidade
  if (filtrosAtivos.cidade && filtrosAtivos.cidade !== 'Todos') {
    resultado = resultado.filter(estab => estab.cidade === filtrosAtivos.cidade);
    console.log(`  Após cidade (${filtrosAtivos.cidade}): ${resultado.length} resultados`);
  }
  
  // Filtro por categoria
  if (filtrosAtivos.categoria && filtrosAtivos.categoria !== 'Todos') {
    resultado = resultado.filter(estab => {
      return estab.categorias && 
             Array.isArray(estab.categorias) && 
             estab.categorias.includes(filtrosAtivos.categoria);
    });
    console.log(`  Após categoria (${filtrosAtivos.categoria}): ${resultado.length} resultados`);
  }
  
  // Filtro por grupo
  if (filtrosAtivos.grupo && filtrosAtivos.grupo !== 'Todos') {
    const grupoId = parseInt(filtrosAtivos.grupo);
    resultado = resultado.filter(estab => estab.grupoId === grupoId);
    console.log(`  Após grupo (${grupoId}): ${resultado.length} resultados`);
  }
  
  console.log(`✅ ${resultado.length} de ${estabelecimentosCache.length} estabelecimentos`);
  
  if (typeof renderizarLista === 'function') {
    renderizarLista(resultado, "listaCards");
  } else {
    console.error("❌ Função renderizarLista não encontrada!");
  }
  
  _atualizarContadores();
}


// ========== ATUALIZAR CONTADORES ==========
function _atualizarContadores() {
  const total = estabelecimentosCache.length;
  const publicados = estabelecimentosCache.filter(e => e.statusPublicacao === "Publicado").length;
  const rascunhos = estabelecimentosCache.filter(e => e.statusPublicacao === "Rascunho").length;
  
  const countTodos = document.getElementById("count-todos");
  const countPublicados = document.getElementById("count-publicados");
  const countRascunhos = document.getElementById("count-rascunhos");
  
  if (countTodos) countTodos.textContent = total;
  if (countPublicados) countPublicados.textContent = publicados;
  if (countRascunhos) countRascunhos.textContent = rascunhos;
  
  console.log(`📊 Contadores: Total=${total}, Publicados=${publicados}, Rascunhos=${rascunhos}`);
}


// ========== INICIALIZAÇÃO AUTOMÁTICA ==========
// Garante que os filtros sejam inicializados quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarFiltros);
} else {
  // DOM já está pronto, inicializa imediatamente
  inicializarFiltros();
}
// ========== LIMPAR FILTROS ==========
function limparFiltros() {
  console.log("🧹 Limpando filtros...");
  
  // Reseta o estado
var filtrosAtivos = {
  busca: "",
  status: "todos",
  statusOperacional: "Todos",
  cidade: "Todos",
  categoria: "Todos",
  grupo: "Todos"
};
  
  // Limpa os campos
  const inputBusca = document.querySelector(".search-estab");
  if (inputBusca) inputBusca.value = "";
  
  const selectCidade = document.getElementById("filtroCidade");
  if (selectCidade) selectCidade.value = "";
  
  const selectCategoria = document.getElementById("filtroCategoria");
  if (selectCategoria) selectCategoria.value = "";
  
  const selectGrupo = document.getElementById("filtroGrupo");
  if (selectGrupo) selectGrupo.value = "";

  const filtroStatusOp = document.getElementById("filtroStatusOperacional");
  if (filtroStatusOp) filtroStatusOp.value = "Todos";
  filtrosAtivos.statusOperacional = "Todos";
  
  // Ativa a tab "Todos"
  const tabs = document.querySelectorAll(".tab-filtro");
  tabs.forEach(tab => tab.classList.remove("active"));
  
  const tabTodos = document.querySelector('[data-status="todos"]');
  if (tabTodos) tabTodos.classList.add("active");
  
  // Reaplica os filtros
  aplicarFiltros();
  
  console.log("✅ Filtros limpos");
}

// ========== RECARREGAR FILTROS ==========
function recarregarFiltros() {
  console.log("🔄 Recarregando filtros...");
  _popularFiltroCidades();
  _popularFiltroCategorias();
  _popularFiltroGrupos();
  _atualizarContadores();
  aplicarFiltros();
}


// ========== EVENT LISTENERS ==========
function inicializarFiltrosEstabelecimentos() {
  // Busca por texto
  document.querySelector(".search-estab")?.addEventListener("input", e => {
    filtrosAtivos.busca = e.target.value;
    aplicarFiltros();
  });

  // Filtro de status (Todos, Publicados, Rascunhos)
  document.querySelectorAll(".tab-filtro").forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active de todos
      document.querySelectorAll(".tab-filtro").forEach(t => t.classList.remove("active"));
      // Adiciona active no clicado
      tab.classList.add("active");
      
      // Atualiza o filtro
      filtrosAtivos.status = tab.dataset.status;
      aplicarFiltros();
    });
  });

  // Filtro por cidade
  document.getElementById("filtroCidade")?.addEventListener("change", e => {
    filtrosAtivos.cidade = e.target.value;
    aplicarFiltros();
  });

  // Filtro por categoria
  document.getElementById("filtroCategoria")?.addEventListener("change", e => {
    filtrosAtivos.categoria = e.target.value;
    aplicarFiltros();
  });

  // Filtro por grupo
  document.getElementById("filtroGrupo")?.addEventListener("change", e => {
    filtrosAtivos.grupo = e.target.value;
    aplicarFiltros();
  });
}

async function popularFiltros() {
  console.log("📋 Populando filtros...");
  
  // Popula cada filtro individualmente
  _popularFiltroCidades();
  _popularFiltroCategorias();
  _popularFiltroGrupos();
}


function inicializarFiltroDashboard() {
  const tabAtiva = document.querySelector(".tab.active");

  if (!tabAtiva) return;

  filtrarDashboard(tabAtiva.dataset.status);
}

function filtrarDashboard(statusFiltro) {
  const listaFiltrada = estabelecimentosCache.filter(estab => {
    if (statusFiltro === "publicados") {
      return estab.status === "Publicado";
    }

    if (statusFiltro === "rascunhos") {
      return estab.status === "Rascunho";
    }

    return true; // fallback (todos)
  });

  renderizarLista(listaFiltrada, "listaCardsDashboard");
}

//Dashboard Filter Button
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    filtrarDashboard(tab.dataset.status);

    const paginaAtiva = document.querySelector(".page .active");
    console.log('pagina ativa: ', paginaAtiva)

 
  });
});

// ========== INICIALIZAÇÃO AUTOMÁTICA ==========
// Garante que os filtros sejam inicializados quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarFiltros);
} else {
  // DOM já está pronto, inicializa imediatamente
  inicializarFiltros();
}



async function carregarCidades() {
  const estadoId = document.getElementById("estadoId2").value;
  const selectCidade = document.getElementById("cidadeId2");
  const token = localStorage.getItem("token");

  selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';

  if (!estadoId) return;

  if (!token) {
    console.error("Token não encontrado");
    selectCidade.innerHTML = '<option value="">Erro de autenticação</option>';
    return;
  }

  try {
    selectCidade.innerHTML = '<option value="">Carregando cidades...</option>';

    const res = await fetch(`${API_BASE}/api/Cidades/por-estado/${estadoId}`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const cidades = await res.json();

    if (!Array.isArray(cidades) || cidades.length === 0) {
      selectCidade.innerHTML = '<option value="">Nenhuma cidade disponível</option>';
      return;
    }

    selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';

    cidades.forEach(cidade => {
      const option = document.createElement("option");
      option.value = cidade.id;
      option.textContent = cidade.nome;
      selectCidade.appendChild(option);
    });

  } catch (err) {
    console.error("Erro ao carregar cidades:", err);
    selectCidade.innerHTML = '<option value="">Erro ao carregar cidades</option>';
  }
}

async function carregarEstados() {
  const selectEstado = document.getElementById("estadoId2");
  selectEstado.innerHTML = '<option value="">Carregando estados...</option>';

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Token não encontrado");

    const res = await fetch(`${API_BASE}/api/UnidadesFederativas/por-estabelecimento`, {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);

    const estados = await res.json();

    if (!Array.isArray(estados) || estados.length === 0) {
      selectEstado.innerHTML = '<option value="">Nenhum estado disponível</option>';
      return;
    }

    selectEstado.innerHTML = '<option value="">Selecione um estado</option>';

    estados.forEach(estado => {
      const option = document.createElement("option");
      option.value = estado.id;
      option.textContent = `${estado.nome} (${estado.sigla})`;
      selectEstado.appendChild(option);
    });

    // evita duplicação de evento
    selectEstado.removeEventListener("change", carregarCidades);
    selectEstado.addEventListener("change", carregarCidades);

    console.log("Estados carregados (por estabelecimento)");

  } catch (error) {
    console.error("Erro ao carregar estados:", error);
    selectEstado.innerHTML = '<option value="">Erro ao carregar estados</option>';
  }
}

async function carregarCidades2(nomeCidadeSelecionada = null) {
  const estadoId2 = document.getElementById("estadoId2-edit").value;
  const token = localStorage.getItem("token");

  if (!estadoId2 || !token) return;

  console.log("carregarCidades() chamado com estadoId =", estadoId2);

  try {
    const res = await fetch(`${API_BASE}/api/Cidades/por-estado/${estadoId2}`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!res.ok) throw new Error("Erro ao buscar cidades.");

    const cidades = await res.json();
    console.log("Cidades carregadas:", cidades);

    const selectCidade = document.getElementById("cidadeId2-edit");
    selectCidade.innerHTML = '<option value="">Selecione uma cidade</option>';

    cidades.forEach(cidade => {
      const option = document.createElement("option");
      option.value = cidade.id;
      option.textContent = cidade.nome;
      selectCidade.appendChild(option);
    });

    // 🔹 Se foi passado o nome da cidade, seleciona ela automaticamente
    if (nomeCidadeSelecionada) {
      const cidadeEncontrada = cidades.find(c => c.nome === nomeCidadeSelecionada);
      
      if (cidadeEncontrada) {
        selectCidade.value = cidadeEncontrada.id;
        console.log(`Cidade "${nomeCidadeSelecionada}" selecionada (ID: ${cidadeEncontrada.id})`);
      } else {
        console.warn(`Cidade "${nomeCidadeSelecionada}" não encontrada na lista.`);
      }
    }

  } catch (err) {
    alert("Erro ao carregar cidades: " + err.message);
    console.error(err);
  }
}




async function enviarImagemEstabelecimento(estabelecimentoId, file, principal, fachada) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("imagem", file);

  const url =
    `${API_BASE}/api/estabelecimentos/${estabelecimentoId}/imagens` +
    `?principal=${principal}&fachada=${fachada}&logo=${principal}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token
    },
    body: formData
  });

  if (!res.ok) {
    const erro = await res.text();
    throw new Error("Erro imagem: " + erro);
  }
}

//Cartões
async function vincularCartoes(estabelecimentoId, cartoesIds) {
  const token = localStorage.getItem("token");
  if (!token || !cartoesIds.length) return;

  const res = await fetch(
    `${API_BASE}/api/Cartoes/${estabelecimentoId}/vincular-estabelecimento`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(cartoesIds)
    }
  );

  if (!res.ok) {
    const erro = await res.text();
    throw new Error("Erro ao vincular cartões: " + erro);
  }
}

function obterCartoesSelecionados() {
  return Array.from(
    document.querySelectorAll(".cards-row input[type='checkbox']:checked")
  ).map(input => Number(input.id));
}


//Estabelecimento Section
async function cadastrarEstabelecimento2() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  console.log('peguei o token e...')
  console.log("API_BASE:", API_BASE);

  const categoriaId = parseInt(document.getElementById("categoriaId2").value) || null;
  const ativo = document.getElementById("ativoEstab2").checked;

  const data = {
    "nome": document.getElementById("nomeEstab2").value.trim(),
    "razaoSocial": document.getElementById("razaoSocial2").value.trim(),
    "cnpj": document.getElementById("cnpj2").value.trim(),
    "telefone": document.getElementById("telefone2").value.trim(),
    "emailContato": document.getElementById("emailContato2").value.trim(),
    "ativo": ativo,

    "categoriaId": categoriaId,
    "cidadeId": Number(document.getElementById("cidadeId2").value),

    "rua": document.getElementById("rua2").value.trim(),
    "numero": document.getElementById("numero2").value.trim(),
    "bairro": document.getElementById("bairro2").value.trim(),
    "complemento": document.getElementById("complemento2").value.trim(),
    "cep": document.getElementById("cep2").value.trim(),

    "latitude": Number(document.getElementById("latitude2").value),
    "longitude": Number(document.getElementById("longitude2").value),

    "grupoId": Number(document.getElementById("grupo2").value) || null,
    "mapaUrl": document.getElementById("mapurl2").value.trim(),
    "sobre": document.getElementById("sobre2").value.trim(),

    // Status
    "statusPublicacao": document.getElementById("statusPublicacao2").value,
    "statusOperacional": document.getElementById("statusOperacional2").value,
    "motivoCancelamento": document.getElementById("statusOperacional2").value === "Cancelado"
      ? document.getElementById("motivoCancelamento2").value.trim()
      : "",

    // Consultor
    "consultorNome": document.getElementById("consultorNome2").value.trim(),
    "consultorEmail": document.getElementById("consultorEmail2").value.trim(),

    // Representante Legal
    "representanteLegalNome": document.getElementById("representanteLegalNome2").value.trim(),
    "cpfRepresentante": document.getElementById("cpfRepresentante2").value.trim(),

    // Segundo Contato
    "segundoContatoNome": document.getElementById("segundoContatoNome2").value.trim(),
    "segundoContatoTelefone": document.getElementById("segundoContatoTelefone2").value.trim(),
    "segundoContatoCargo": document.getElementById("segundoContatoCargo2").value.trim(),
  };

  console.log('rodou antes do try');

  try {
    const res = await fetch(`${API_BASE}/api/Estabelecimentos/Criar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data),
    });

    console.log(data);
    console.log('depois do try');

    if (!res.ok) {

       console.log("Status:", res.status);
      console.log("Headers:", [...res.headers.entries()]);

      const erro = await res.text();
      console.log("Corpo do erro:", erro)
      throw new Error(erro);
    }

    const estab = await res.json();

    // 🔹 VINCULAR CATEGORIA
    if (categoriaId) {
      await vincularCategoria(estab.id, categoriaId);
    }

    // 🔹 VINCULAR GRUPO (se selecionado)
    const grupoId = Number(document.getElementById("grupo2").value);
    if (grupoId) {
      await fetch(
        `${API_BASE}/api/Grupos/${grupoId}/vincular-estabelecimentos/${estab.id}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      ).then(res => {
        if (!res.ok) {
          throw new Error("Erro ao vincular grupo");
        }
      });
    }

    // 🔹 VINCULAR CARTÕES
    const cartoesIds = obterCartoesSelecionados();
    if (cartoesIds.length > 0) {
      await vincularCartoes(estab.id, cartoesIds);
    }

    // 🔹 ENVIO DAS IMAGENS
    const logo = document.getElementById("logoImagem2").files[0];
    const fachada = document.getElementById("fachadaImagem2").files[0];

    if (logo) {
      await enviarImagemEstabelecimento(estab.id, logo, true, false);
    }

    if (fachada) {
      await enviarImagemEstabelecimento(estab.id, fachada, false, true);
    }
     console.log('cheguei ate o final antes de sucesso')

    alert("Estabelecimento cadastrado com sucesso!");
    document.getElementById("formCadastro2").reset();

  } catch (err) {

    console.error(err);

    alert("Erro ao cadastrar: " + err.message);
  }
}

  async function vincularCategoria(estabelecimentoId, categoriaId) {
  const token = localStorage.getItem("token");
  await fetch(`${API_BASE}/api/Estabelecimentos/${estabelecimentoId}/vincular-categorias`, {
    method: "POST", // ← alterado de PUT para POST
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify([categoriaId]) // ← continua um array
  });
}


async function salvarEdicaoEstabelecimento(e) {
  e.preventDefault();

  const token = localStorage.getItem("token");
  const id = document.getElementById("editId2").value;

  const ativo = document.getElementById("ativoEstab2-edit").checked;

const data = {
  "nome": document.getElementById("nomeEstab2-edit").value.trim(),
  "razaoSocial": document.getElementById("razaoSocial2-edit").value.trim(),
  "cnpj": document.getElementById("cnpj2-edit").value.trim(),
  "telefone": document.getElementById("telefone2-edit").value.trim(),
  "emailContato": document.getElementById("emailContato2-edit").value.trim(),
  "ativo": ativo,

  "categoriaId": Number(document.getElementById("categoriaId2-edit").value),
  "cidadeId": Number(document.getElementById("cidadeId2-edit").value),

  "rua": document.getElementById("rua2-edit").value.trim(),
  "numero": document.getElementById("numero2-edit").value.trim(),
  "bairro": document.getElementById("bairro2-edit").value.trim(),
  "complemento": document.getElementById("complemento2-edit").value.trim(),
  "cep": document.getElementById("cep2-edit").value.trim(),

  "latitude": Number(document.getElementById("latitude2-edit").value),
  "longitude": Number(document.getElementById("longitude2-edit").value),

  "grupoId": null,
  "mapaUrl": document.getElementById("mapurl2-edit").value.trim(),
  "sobre": document.getElementById("sobre2-edit").value.trim(),
  "status": ativo ? "Publicado" : "Rascunho"
};

  try {
    const res = await fetch(`${API_BASE}/api/Estabelecimentos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error("Erro ao atualizar estabelecimento");

    alert("Estabelecimento atualizado com sucesso!");
    fecharModalEditarVer();

    // limpa o cache antes de recarregar
localStorage.removeItem("estabelecimentosCache");
localStorage.removeItem("estabelecimentosCacheTime");

await new Promise(r => setTimeout(r, 500)); // aguarda 500ms
    await buscarEstabelecimentos(true);

  } catch (err) {
    console.error(err);
    alert("Erro ao salvar alterações");
  }
}



function renderizarImagensEdicao(estab) {
  const container = document.getElementById("imagensEditContainer");
  container.innerHTML = "";

  const imagens = estab.imagens || [];

  const logo = imagens.find(img => img.logo === true);
  const fachada = imagens.find(img => img.fachada === true);

  // 🔹 LOGO
  container.appendChild(
    criarBlocoImagem({
      titulo: "Logo",
      imagem: logo,
      estabId: estab.id,
      isLogo: true,
      isFachada: false
    })
  );

  // 🔹 FACHADA
  container.appendChild(
    criarBlocoImagem({
      titulo: "Fachada",
      imagem: fachada,
      estabId: estab.id,
      isLogo: false,
      isFachada: true
    })
  );
}

function criarBlocoImagem({ titulo, imagem, estabId, isLogo, isFachada }) {
  const div = document.createElement("div");
  div.className = "imagem-edit-item";

  const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';



  const tipoClasse = isLogo ? "upload-logo" : "upload-fachada";
  const srcImagem = imagem?.url || PLACEHOLDER;

  div.innerHTML = `
    <strong>${titulo}</strong>

    <div class="upload-card ${tipoClasse}">
      <img />

      <div class="upload-overlay">
        <label class="upload-action">
          <img src="./imgs/image-up.png" class="icon-edit" />
          <input
            type="file"
            accept="image/*"
            onchange="${
              imagem
                ? `substituirImagem(event, ${estabId}, ${imagem.id}, ${isLogo}, ${isFachada})`
                : `adicionarImagemNova(event, ${estabId}, ${isLogo}, ${isFachada})`
            }"
          />
        </label>

        ${
          imagem
            ? `
              <button
                type="button"
                class="upload-action danger"
                onclick="excluirImagem(${imagem.id}, ${estabId})"
              >
                <img src="./imgs/trash-02.png" class="icon-edit" />
              </button>
            `
            : ""
        }
      </div>
    </div>
  `;

  // 🔥 fallback de imagem
  const img = div.querySelector("img");
  img.src = srcImagem;

  img.onerror = () => {
    img.onerror = null;
    img.src = PLACEHOLDER;
  };

  return div;
}


async function adicionarImagemNova(event, estabId, isLogo, isFachada) {
  const file = event.target.files[0];
  if (!file) return;

  await enviarImagemEstabelecimento(
    estabId,
    file,
    isLogo,
    isFachada
  );

  alert("Imagem adicionada com sucesso");
  recarregarEstabelecimentoEdit();
}


async function excluirImagem(imagemId, estabId) {
  const token = localStorage.getItem("token");

  if (!confirm("Deseja realmente excluir esta imagem?")) return;

  const res = await fetch(
    `${API_BASE}/api/estabelecimentos/${estabId}/imagens/${imagemId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    }
  );

  if (!res.ok) {
    alert("Erro ao excluir imagem");
    return;
  }

  alert("Imagem excluída com sucesso");

  // 🔄 Reabrir modal atualizado
  recarregarEstabelecimentoEdit();
}

async function substituirImagem(
  event,
  estabId,
  imagemId,
  isLogo,
  isFachada
) {
  const file = event.target.files[0];
  if (!file) return;

  const token = localStorage.getItem("token");
  if (!token) return;

  try {
    // 1️⃣ Tenta excluir a imagem antiga (se existir)
    if (imagemId) {
      const delResp = await fetch(
        `${API_BASE}/api/estabelecimentos/${estabId}/imagens/${imagemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token
          }
        }
      );

      // ✔️ 404 = imagem já não existe → segue o fluxo
      if (!delResp.ok && delResp.status !== 404) {
        throw new Error("Erro ao excluir imagem antiga");
      }
    }

    // 2️⃣ Sempre tenta enviar a nova imagem
    await enviarImagemEstabelecimento(
      estabId,
      file,
      isLogo,
      isFachada
    );

    alert("Imagem atualizada com sucesso");

    // 🔄 Atualiza visual
    recarregarEstabelecimentoEdit();

  } catch (err) {
    console.error(err);
    alert("Erro ao substituir a imagem.");
  } finally {
    // limpa o input para permitir reenviar o mesmo arquivo se necessário
    event.target.value = "";
  }
}

function fecharModalEditar() {
  document.getElementById("estadoId2-edit").value = " "
  document.getElementById("cidadeId2-edit").value = " "
  document.getElementById("modalEditarOverlay2").style.display = "none";
}



async function recarregarEstabelecimentoEdit() {
  const id = document.getElementById("editId2").value;
  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API_BASE}/api/Estabelecimentos/${id}`,
    {
      headers: { Authorization: "Bearer " + token }
    }
  );

  const estabAtualizado = await res.json();
  renderizarImagensEdicao(estabAtualizado);
}


// ============================================================
//  MODAL VER / EDITAR ESTABELECIMENTO — Unificado
//  Substitui: abrirModalEditar() e o antigo #modalEditarOverlay2
// ============================================================

// Guarda o objeto completo do estab aberto atualmente
let _estabAtual = null;

// ── ABRIR ────────────────────────────────────────────────────

// Carrega cidades do estado via endpoint correto e seleciona pelo nome
async function carregarCidadesVer(cidadeNomeSelecionada = null) {
  const token    = localStorage.getItem("token");
  const estadoId = document.getElementById("vi-estadoId").value;
  if (!estadoId || !token) return;

  try {
    const res = await fetch(
      `${API_BASE}/api/Cidades/por-estabelecimento/${estadoId}`,
      { headers: { "Authorization": "Bearer " + token } }
    );
    if (!res.ok) return;

    const cidades = await res.json();
    const select  = document.getElementById("vi-cidadeId");
    select.innerHTML = "";

    cidades.forEach(cidade => {
      const opt      = document.createElement("option");
      opt.value      = cidade.id;
      opt.textContent = cidade.nome;

      // Seleciona pelo match exato de nome (ex: "Americana")
      if (cidadeNomeSelecionada && cidade.nome === cidadeNomeSelecionada) {
        opt.selected = true;
      }

      select.appendChild(opt);
    });

  } catch (err) {
    console.error("Erro ao carregar cidades:", err);
  }
}


// ============================================================
//  PREVIEW REATIVO — Modal Ver/Editar
//  Espelha o comportamento do atualizarPreview() do modal criar
// ============================================================

function atualizarPreviewVer() {
  // Nome
  const nome = document.getElementById("vi-nomeEstab")?.value.trim() || 
               document.getElementById("vv-nome")?.textContent || "Nome do Estabelecimento";
  document.getElementById("ver-nome").textContent        = nome;
  document.getElementById("ver-nome-mobile").textContent = nome;

  // Telefone
  const telefone = document.getElementById("vi-telefone")?.value.trim() ||
                   document.getElementById("vv-telefone")?.textContent || "—";
  document.getElementById("ver-telefone").textContent = telefone;

  // Sobre
  const sobre = document.getElementById("vi-sobre")?.value.trim() ||
                document.getElementById("vv-sobre")?.textContent || "—";
  document.getElementById("ver-sobre").textContent = sobre;

  // Endereço
  const rua         = document.getElementById("vi-rua")?.value.trim()         || document.getElementById("vv-rua")?.textContent        || "";
  const numero      = document.getElementById("vi-numero")?.value.trim()      || document.getElementById("vv-numero")?.textContent     || "";
  const bairro      = document.getElementById("vi-bairro")?.value.trim()      || document.getElementById("vv-bairro")?.textContent     || "";
  const complemento = document.getElementById("vi-complemento")?.value.trim() || document.getElementById("vv-complemento")?.textContent|| "";

  const cidadeSelect = document.getElementById("vi-cidadeId");
  const cidade = cidadeSelect?.options[cidadeSelect.selectedIndex]?.text ||
                 document.getElementById("vv-cidade")?.textContent || "";

  let endereco = "";
  if (rua)         endereco += rua;
  if (numero)      endereco += `, ${numero}`;
  if (complemento) endereco += ` - ${complemento}`;
  if (bairro)      endereco += ` - ${bairro}`;
  if (endereco)    endereco += ` - ${cidade}/SP`;
  else             endereco  = "—";

  document.getElementById("ver-endereco").textContent = endereco;

  // Categoria
  const catSelect = document.getElementById("vi-categoriaId");
  const categoria = catSelect?.options[catSelect.selectedIndex]?.text ||
                    document.getElementById("vv-categoria")?.textContent || "—";
  document.getElementById("ver-categoria").textContent = categoria;
}

// ============================================================
//  LIGAR EVENTOS REATIVOS nos inputs do modal de edição
//  Chame esta função UMA VEZ dentro de abrirModalEditar()
// ============================================================

function _ligarPreviewReativoVer() {
  const mapeamento = [
    { inputId: "vi-nomeEstab"  },
    { inputId: "vi-telefone"   },
    { inputId: "vi-sobre"      },
    { inputId: "vi-rua"        },
    { inputId: "vi-numero"     },
    { inputId: "vi-bairro"     },
    { inputId: "vi-complemento"},
    { inputId: "vi-cidadeId"   },
    { inputId: "vi-categoriaId"},
  ];

  mapeamento.forEach(({ inputId }) => {
    const el = document.getElementById(inputId);
    if (!el) return;
    // Remove listener antigo para não duplicar
    el.removeEventListener("input",  atualizarPreviewVer);
    el.removeEventListener("change", atualizarPreviewVer);
    el.addEventListener("input",  atualizarPreviewVer);
    el.addEventListener("change", atualizarPreviewVer);
  });
}


// ============================================================
//  VIEWPORT — botões Desktop / Tablet / Mobile
//  Igual ao comportamento do modal de criação
// ============================================================

function mudarViewportVer(tipo) {
  const wrapper = document.getElementById("ver-preview-wrapper");
  if (!wrapper) return;

  // Remove classes anteriores
  wrapper.classList.remove("viewport-tablet", "viewport-mobile");

  if (tipo === "tablet") wrapper.classList.add("viewport-tablet");
  if (tipo === "mobile") wrapper.classList.add("viewport-mobile");

  // Atualiza botões ativos
  ["desktop", "tablet", "mobile"].forEach(t => {
    const btn = document.getElementById(`btn-${t}-v`);
    if (btn) btn.classList.toggle("active", t === tipo);
  });
}


// ============================================================
//  abrirModalEditar — versão final com preview reativo
// ============================================================

async function abrirModalEditar(estab) {
  _estabAtual = estab;

  // Mostra loader enquanto carrega
  mostrarLoader("Carregando estabelecimento...", "Aguarde um momento");

  _setModoVisualizacao();
  _popularVerModal(estab);
  _ligarPreviewReativoVer();

  await Promise.all([
    carregarCategoriasVer(estab.categorias?.[0]),
    carregarEstadosVer()
  ]);

  if (estab.unidadeFederativaId) {
    document.getElementById("vi-estadoId").value = estab.unidadeFederativaId;
    await carregarCidadesVer(estab.cidade);
  }

  atualizarPreviewVer();
  mudarViewportVer("desktop");

  // Esconde loader e abre modal
  ocultarLoader();

  const modal = document.getElementById("modal-ver-estab");
  modal.style.display = "";
  modal.classList.add("active");
}

// Fechar
function fecharVerEstab() {
  const modal = document.getElementById("modal-ver-estab");
  modal.classList.remove("active");
  modal.style.display = "none";
  _estabAtual = null;
  _setModoVisualizacao();
}

// ── MODO VISUALIZAÇÃO / EDIÇÃO ────────────────────────────────

function ativarModoEdicao() {
  if (!_estabAtual) return;

  // Preenche os inputs com os valores atuais
  _preencherInputs(_estabAtual);

  // Troca .ver-value por .ver-input em todos os campos
  document.querySelectorAll("#modal-ver-estab .ver-value").forEach(el => (el.style.display = "none"));
  document.querySelectorAll("#modal-ver-estab .ver-input").forEach(el => (el.style.display = ""));

  // Mostra/esconde botões
  document.getElementById("btn-ativar-edicao").style.display   = "none";
  document.getElementById("btn-salvar-edicao").style.display   = "";
  document.getElementById("btn-cancelar-edicao").style.display = "";

  // Imagens: mostrar overlays de troca
  _toggleImagensEdicao(true);

  // Status Operacional: checar motivo
  toggleMotivoVer();
}

function cancelarModoEdicao() {
  _setModoVisualizacao();
}

function _setModoVisualizacao() {
  document.querySelectorAll("#modal-ver-estab .ver-value").forEach(el => (el.style.display = ""));
  document.querySelectorAll("#modal-ver-estab .ver-input").forEach(el => (el.style.display = "none"));

  document.getElementById("btn-ativar-edicao").style.display   = "";
  document.getElementById("btn-salvar-edicao").style.display   = "none";
  document.getElementById("btn-cancelar-edicao").style.display = "none";

  // Esconde campo motivo cancelamento
  document.getElementById("ver-row-motivo").style.display = "none";

  _toggleImagensEdicao(false);
}

// ── POPULAR MODAL COM DADOS DO ESTAB ─────────────────────────

function _popularVerModal(estab) {
  // ID oculto
  document.getElementById("ver-estab-id").value = estab.id;

  // Título no header
  document.getElementById("ver-form-nome-titulo").textContent = estab.nome || "—";

  // Badges de status
  const badgePub = document.getElementById("ver-badge-pub");
  badgePub.textContent = estab.statusPublicacao || "Rascunho";
  badgePub.className   = "badge-pub " + (estab.statusPublicacao === "Publicado" ? "pub-publicado" : "pub-rascunho");

  const badgeOp = document.getElementById("ver-badge-op");
  badgeOp.textContent = estab.statusOperacional || "Ativo";
  badgeOp.className   = "badge-op status-op-" + (estab.statusOperacional || "Ativo").toLowerCase();

  // Preview do site (lado esquerdo)
  _atualizarPreviewVer(estab);

  // Campos .ver-value
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "—";
  };

  set("vv-nome",         estab.nome);
  set("vv-razaoSocial",  estab.razaoSocial);
  set("vv-cnpj",         estab.cnpj);
  set("vv-telefone",     estab.telefone);
  set("vv-email",        estab.emailContato);
  set("vv-sobre",        estab.sobre);
  set("vv-statusPub",    estab.statusPublicacao);
  set("vv-statusOp",     estab.statusOperacional);
  set("vv-motivo",       estab.motivoCancelamento);
  set("vv-categoria",    estab.categorias?.[0] || "—");
  set("vv-cep",          estab.cep);
  set("vv-estado",       estab.unidadeFederativa || "—");
  set("vv-cidade",       estab.cidade);
  set("vv-rua",          estab.rua);
  set("vv-numero",       estab.numero);
  set("vv-bairro",       estab.bairro);
  set("vv-complemento",  estab.complemento);
  set("vv-mapurl",       estab.mapaUrl);
  set("vv-latitude",     estab.latitude);
  set("vv-longitude",    estab.longitude);
  set("vv-consultorNome",  estab.consultorNome);
  set("vv-consultorEmail", estab.consultorEmail);
  set("vv-repNome",      estab.representanteLegalNome);
  set("vv-repCpf",       estab.cpfRepresentante);
  set("vv-seg2Nome",     estab.segundoContatoNome);
  set("vv-seg2Tel",      estab.segundoContatoTelefone);
  set("vv-seg2Cargo",    estab.segundoContatoCargo);

  // Motivo cancelamento: mostra apenas se cancelado (em modo viz)
  const rowMotivo = document.getElementById("ver-row-motivo");
  if (estab.statusOperacional === "Cancelado") {
    rowMotivo.style.display = "";
  }

  // Cartões
  _renderizarCartoesVer(estab);

  // Imagens
  _renderizarImagensVer(estab);
}

function _preencherInputs(estab) {
  const setInput = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };

  setInput("vi-nomeEstab",     estab.nome);
  setInput("vi-razaoSocial",   estab.razaoSocial);
  setInput("vi-cnpj",          estab.cnpj);
  setInput("vi-telefone",      estab.telefone);
  setInput("vi-email",         estab.emailContato);
  setInput("vi-sobre",         estab.sobre);
  setInput("vi-statusPub",     estab.statusPublicacao);
  setInput("vi-statusOp",      estab.statusOperacional);
  setInput("vi-motivo",        estab.motivoCancelamento);
  setInput("vi-cep",           estab.cep);
  setInput("vi-rua",           estab.rua);
  setInput("vi-numero",        estab.numero);
  setInput("vi-bairro",        estab.bairro);
  setInput("vi-complemento",   estab.complemento);
  setInput("vi-mapurl",        estab.mapaUrl);
  setInput("vi-latitude",      estab.latitude);
  setInput("vi-longitude",     estab.longitude);
  setInput("vi-consultorNome", estab.consultorNome);
  setInput("vi-consultorEmail",estab.consultorEmail);
  setInput("vi-repNome",       estab.representanteLegalNome);
  setInput("vi-repCpf",        estab.cpfRepresentante);
  setInput("vi-seg2Nome",      estab.segundoContatoNome);
  setInput("vi-seg2Tel",       estab.segundoContatoTelefone);
  setInput("vi-seg2Cargo",     estab.segundoContatoCargo);

  // Selects que precisam de valor numérico
  if (estab.unidadeFederativaId) {
    document.getElementById("vi-estadoId").value = estab.unidadeFederativaId;
  }
}

// ── PREVIEW LADO ESQUERDO ────────────────────────────────────

function _atualizarPreviewVer(estab) {
  const PLACEHOLDER = "./imgs/default-image.png";

  const imagens   = estab.imagens || [];
  const logoObj   = imagens.find(i => i.logo);
  const fachadaObj= imagens.find(i => i.fachada);

  const logoSrc    = logoObj?.url    || estab.imagemPrincipal || PLACEHOLDER;
  const fachadaSrc = fachadaObj?.url || estab.imagemPrincipal || PLACEHOLDER;

  // Atualiza todas as imgs do preview
  ["ver-logo-img", "ver-logo-mobile"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.src = logoSrc; el.onerror = () => { el.onerror=null; el.src=PLACEHOLDER; }; }
  });

  ["ver-fachada-img", "ver-fachada-mobile", "ver-fachada-tablet"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.src = fachadaSrc; el.onerror = () => { el.onerror=null; el.src=PLACEHOLDER; }; }
  });

  // Textos do preview
  const textSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "—"; };
  textSet("ver-nome",       estab.nome);
  textSet("ver-nome-mobile",estab.nome);
  textSet("ver-sobre",      estab.sobre);
  textSet("ver-telefone",   estab.telefone);
  textSet("ver-categoria",  estab.categorias?.[0] || "—");

  const partes = [estab.rua, estab.numero, estab.bairro, estab.cidade].filter(Boolean);
  textSet("ver-endereco", partes.join(", ") || "—");
}

// ── IMAGENS NO PAINEL DIREITO ─────────────────────────────────

function _renderizarImagensVer(estab) {
  const container = document.getElementById("ver-imagens-container");
  container.innerHTML = "";

  const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';

  const imagens   = estab.imagens || [];
  const logoObj   = imagens.find(i => i.logo);
  const fachadaObj= imagens.find(i => i.fachada);

  [
    { label: "Logo",    obj: logoObj,    isLogo: true,  isFachada: false },
    { label: "Fachada", obj: fachadaObj, isLogo: false, isFachada: true  }
  ].forEach(({ label, obj, isLogo, isFachada }) => {
    const src = obj?.url || PLACEHOLDER;

    const wrap = document.createElement("div");
    wrap.className = "ver-img-item";
    wrap.dataset.tipo = label.toLowerCase();

    wrap.innerHTML = `
      <span class="ver-img-label">${label}</span>
      <div class="ver-img-wrap">
        <img class="ver-img-thumb" src="${src}" alt="${label}"
             onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
        <!-- Overlay de edição — visível apenas em modo edição -->
        <div class="ver-img-overlay" style="display:none;">
          <label class="ver-img-btn-trocar" title="Trocar imagem">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <input type="file" accept="image/*"
              onchange="${obj
                ? `_verTrocarImagem(event, ${estab.id}, ${obj.id}, ${isLogo}, ${isFachada})`
                : `_verAdicionarImagem(event, ${estab.id}, ${isLogo}, ${isFachada})`}">
          </label>
          ${obj ? `
          <button type="button" class="ver-img-btn-excluir" title="Excluir imagem"
            onclick="_verExcluirImagem(${obj.id}, ${estab.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>` : ""}
        </div>
      </div>
    `;
    container.appendChild(wrap);
  });
}

function _toggleImagensEdicao(ativar) {
  document.querySelectorAll("#ver-imagens-container .ver-img-overlay").forEach(el => {
    el.style.display = ativar ? "flex" : "none";
  });
}

// ── AÇÕES DE IMAGEM ───────────────────────────────────────────

async function _verTrocarImagem(event, estabId, imagemId, isLogo, isFachada) {
  const file = event.target.files[0];
  if (!file) return;
  const token = localStorage.getItem("token");

  try {
    if (imagemId) {
      const del = await fetch(`${API_BASE}/api/estabelecimentos/${estabId}/imagens/${imagemId}`, {
        method: "DELETE", headers: { Authorization: "Bearer " + token }
      });
      if (!del.ok && del.status !== 404) throw new Error("Erro ao excluir imagem antiga");
    }
    await enviarImagemEstabelecimento(estabId, file, isLogo, isFachada);
    alert("Imagem atualizada com sucesso!");
    await _recarregarEstabVer(estabId);
  } catch (err) {
    console.error(err);
    alert("Erro ao trocar imagem: " + err.message);
  } finally {
    event.target.value = "";
  }
}

async function _verAdicionarImagem(event, estabId, isLogo, isFachada) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    await enviarImagemEstabelecimento(estabId, file, isLogo, isFachada);
    alert("Imagem adicionada com sucesso!");
    await _recarregarEstabVer(estabId);
  } catch (err) {
    console.error(err);
    alert("Erro ao adicionar imagem: " + err.message);
  } finally {
    event.target.value = "";
  }
}

async function _verExcluirImagem(imagemId, estabId) {
  if (!confirm("Deseja realmente excluir esta imagem?")) return;
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/estabelecimentos/${estabId}/imagens/${imagemId}`, {
    method: "DELETE", headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) { alert("Erro ao excluir imagem"); return; }
  alert("Imagem excluída com sucesso!");
  await _recarregarEstabVer(estabId);
}

async function _recarregarEstabVer(estabId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/api/Estabelecimentos/${estabId}`, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!res.ok) return;
  const estab = await res.json();
  _estabAtual = estab;
  _popularVerModal(estab);
  // Mantém modo edição ativo
  ativarModoEdicao();
}

// ── CARTÕES EDICAO ───────────────────────────────────────────────────

async function _renderizarCartoesVer(estab) {
  const listaContainer = document.getElementById("ver-cartoes-container");
  const editContainer  = document.getElementById("ver-cartoes-edit");
  if (!listaContainer || !editContainer) return;

  // IDs dos cartões que o estabelecimento já tem
  const cartoesSelecionados = estab.cartoesAceitos?.map(c => c.id) || [];

  // ── MODO VISUALIZAÇÃO: badges ──────────────────────────────
  if (cartoesSelecionados.length === 0) {
    listaContainer.innerHTML = '<span style="color:#999;font-size:13px;">Nenhum cartão vinculado</span>';
  } else {
    listaContainer.innerHTML = estab.cartoesAceitos
      .map(c => `<span class="badge-cartao-ver">💳 ${c.nome}</span>`)
      .join("");
  }

  // ── MODO EDIÇÃO: checkboxes via API ────────────────────────
  editContainer.innerHTML = '<span style="color:#999;font-size:12px;">Carregando cartões...</span>';

  try {
    const token = localStorage.getItem("token");
    const res   = await fetch(`${API_BASE}/api/Cartoes`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) throw new Error();
    const todosCartoes = await res.json();

    editContainer.innerHTML = "";
    todosCartoes.forEach(cartao => {
      const checked = cartoesSelecionados.includes(cartao.id) ? "checked" : "";
      const label = document.createElement("label");
      label.className = "field-ratio";
      label.style.display = "flex";
      label.innerHTML = `
        <input type="checkbox" class="ver-cartao-check" value="${cartao.id}" ${checked}>
        <span>${cartao.nome}</span>
      `;
      editContainer.appendChild(label);
    });
  } catch {
    editContainer.innerHTML = '<span style="color:#c00;font-size:12px;">Erro ao carregar cartões</span>';
  }
}

// ── SELECTS DINÂMICOS ─────────────────────────────────────────

async function carregarCategoriasVer(categoriaNomeSelecionada = null) {
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/CategoriasEstabelecimentos`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const select = document.getElementById("vi-categoriaId");
    select.innerHTML = "";
    data.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat.id;
      opt.textContent = cat.nome;
      if (cat.nome === categoriaNomeSelecionada) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) { console.error("Erro ao carregar categorias:", err); }
}

async function carregarEstadosVer() {
  // Reutiliza a mesma função já existente no projeto, apenas popula o select correto
  const token = localStorage.getItem("token");
  if (!token) return;
  try {
    const res = await fetch(`${API_BASE}/api/UnidadesFederativas`, {
      headers: { "Authorization": "Bearer " + token }
    });
    if (!res.ok) return;
    const data = await res.json();
    const select = document.getElementById("vi-estadoId");
    select.innerHTML = "";
    data.forEach(uf => {
      const opt = document.createElement("option");
      opt.value = uf.id;
      opt.textContent = uf.nome;
      select.appendChild(opt);
    });
  } catch (err) { console.error("Erro ao carregar estados:", err); }
}


// ── TOGGLE MOTIVO CANCELAMENTO ────────────────────────────────

function toggleMotivoVer() {
  const select    = document.getElementById("vi-statusOp");
  const rowMotivo = document.getElementById("ver-row-motivo");
  if (!select || !rowMotivo) return;

  const isCancelado = select.value === "Cancelado";
  rowMotivo.style.display = isCancelado ? "" : "none";

  // value/display do textarea de motivo
  const vvMotivo = document.getElementById("vv-motivo");
  const viMotivo = document.getElementById("vi-motivo");
  if (isCancelado) {
    // Em modo edição, mostra input; em visualização, mostra .ver-value
    const emEdicao = document.getElementById("vi-nomeEstab").style.display !== "none";
    if (emEdicao) { viMotivo.style.display = ""; vvMotivo.style.display = "none"; }
    else           { vvMotivo.style.display = ""; viMotivo.style.display = "none"; }
  }
}

// ── SALVAR EDIÇÃO ─────────────────────────────────────────────

async function salvarEdicaoUnificada() {
  const token = localStorage.getItem("token");
  const id    = document.getElementById("ver-estab-id").value;
  if (!id) return;

  const statusOp = document.getElementById("vi-statusOp").value;

  const data = {
    "nome":         document.getElementById("vi-nomeEstab").value.trim(),
    "razaoSocial":  document.getElementById("vi-razaoSocial").value.trim(),
    "cnpj":         document.getElementById("vi-cnpj").value.trim(),
    "telefone":     document.getElementById("vi-telefone").value.trim(),
    "emailContato": document.getElementById("vi-email").value.trim(),
    "ativo":        document.getElementById("vi-statusPub").value === "Publicado",

    "categoriaId":  Number(document.getElementById("vi-categoriaId").value) || null,
    "cidadeId":     Number(document.getElementById("vi-cidadeId").value)     || null,

    "rua":          document.getElementById("vi-rua").value.trim(),
    "numero":       document.getElementById("vi-numero").value.trim(),
    "bairro":       document.getElementById("vi-bairro").value.trim(),
    "complemento":  document.getElementById("vi-complemento").value.trim(),
    "cep":          document.getElementById("vi-cep").value.trim(),

    "latitude":     parseFloat(document.getElementById("vi-latitude").value)  || null,
    "longitude":    parseFloat(document.getElementById("vi-longitude").value) || null,

    "grupoId":      _estabAtual?.grupoId || null,
    "mapaUrl":      document.getElementById("vi-mapurl").value.trim(),
    "sobre":        document.getElementById("vi-sobre").value.trim(),

    "statusPublicacao":  document.getElementById("vi-statusPub").value,
    "statusOperacional": statusOp,

    "consultorNome":          document.getElementById("vi-consultorNome").value.trim(),
    "consultorEmail":         document.getElementById("vi-consultorEmail").value.trim(),
    "representanteLegalNome": document.getElementById("vi-repNome").value.trim(),
    "cpfRepresentante":       document.getElementById("vi-repCpf").value.trim(),

    "motivoCancelamento": statusOp === "Cancelado"
      ? document.getElementById("vi-motivo").value.trim()
      : "",

    "segundoContatoNome":      document.getElementById("vi-seg2Nome").value.trim(),
    "segundoContatoTelefone":  document.getElementById("vi-seg2Tel").value.trim(),
    "segundoContatoCargo":     document.getElementById("vi-seg2Cargo").value.trim(),

    // ✅ Cartões selecionados nos checkboxes do modo edição
    "cartoesAceitosIds": Array.from(
      document.querySelectorAll('#ver-cartoes-edit .ver-cartao-check:checked')
    ).map(el => Number(el.value)),
  };

  try {
    const res = await fetch(`${API_BASE}/api/Estabelecimentos/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resposta da API:", errText);
      throw new Error(errText || `HTTP ${res.status}`);
    }

    alert("Estabelecimento atualizado com sucesso!");

    const idx = estabelecimentosCache.findIndex(e => e.id === _estabAtual.id);
    if (idx !== -1) estabelecimentosCache[idx] = { ...estabelecimentosCache[idx], ...data };

    fecharVerEstab();
    buscarEstabelecimentos();
    if (typeof _atualizarContadores === "function") _atualizarContadores();

  } catch (err) {
    console.error("Erro ao salvar:", err);
    alert("Erro ao salvar alterações: " + err.message);
  }
}

// ── COMPATIBILIDADE: fecharModalEditar antigo ────────────────
// (mantido para não quebrar chamadas existentes no código)
function fecharModalEditarVer() {
  fecharVerEstab();
}


async function carregarEstadosModal() {
  const estados = [
    { id: 1, nome: "São Paulo" },
    { id: 2, nome: "Rio de Janeiro" },
    { id: 3, nome: "Minas Gerais" }
  ];

  const selectEstado = document.getElementById("estadoId2-edit");
  selectEstado.innerHTML = `<option value="">Selecione um estado</option>`;

  estados.forEach(estado => {
    const option = document.createElement("option");
    option.value = estado.id;
    option.textContent = estado.nome;
    selectEstado.appendChild(option);
  });

  console.log(
    "Estados carregados (modal):",
    Array.from(selectEstado.options).map(o => o.textContent)
  );
}


//Testes com modalEstab

// Variáveis globais para armazenar imagens temporárias
let previewLogoUrl = null;
let previewFachadaUrl = null;

const btnDesktopP = document.getElementById('btn-desktop-p');
const btnTabletP  = document.getElementById('btn-tablet-p');
const btnMobileP  = document.getElementById('btn-mobile-p');
const wrapperPreview = document.getElementById('preview-comercio-wrapper');

const viewportBtns = [btnDesktopP, btnTabletP, btnMobileP];

function setViewport(mode) {
  // Remove todas as classes de viewport
  wrapperPreview.classList.remove('viewport-tablet', 'viewport-mobile');

  // Remove active de todos os botões
  viewportBtns.forEach(b => b.classList.remove('active'));

  if (mode === 'tablet') {
    wrapperPreview.classList.add('viewport-tablet');
    wrapperPreview.style.maxWidth = '768px';
    btnTabletP.classList.add('active');
  } else if (mode === 'mobile') {
    wrapperPreview.classList.add('viewport-mobile');
    wrapperPreview.style.maxWidth = '480px';
    btnMobileP.classList.add('active');
  } else {
    wrapperPreview.style.maxWidth = '100%';
    btnDesktopP.classList.add('active');
  }
}





btnDesktopP.addEventListener('click', () => setViewport('desktop'));
btnTabletP.addEventListener('click',  () => setViewport('tablet'));
btnMobileP.addEventListener('click',  () => setViewport('mobile'));

// Abrir modal de preview do estab
async function abrirPreview() {
  const modal = document.getElementById('modal-preview');
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);

  // Carrega grupos e popula o select
  await popularSelectGrupos('grupo2');
  await carregarEstados()
  await carregarCidades()
  await carregarCategorias();

  // Inicializar preview vazio
  atualizarPreview();
}

// Fechar modal de preview
function fecharPreview() {
  const modal = document.getElementById('modal-preview');
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
  
  // Limpar formulário
  document.getElementById('formCadastro2').reset();
  previewLogoUrl = null;
  previewFachadaUrl = null;
}

// Preview de imagens
function previewImagem(input, tipo) {
  const file = input.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const url = e.target.result;
    
    if (tipo === 'logo') {
      previewLogoUrl = url;
      // Atualizar todas as instâncias do logo no preview
      document.getElementById('prev-logo-img').src = url;
      document.getElementById('prev-logo-mobile').src = url;
      
      const previewContainer = document.getElementById('preview-logo-small');
      previewContainer.innerHTML = `<img src="${url}" alt="Preview Logo">`;
    } else if (tipo === 'fachada') {
      previewFachadaUrl = url;
      // Atualizar todas as instâncias da fachada no preview
      document.getElementById('prev-fachada-img').src = url;
      document.getElementById('prev-fachada-mobile').src = url;
      document.getElementById('prev-fachada-tablet').src = url;
      
      const previewContainer = document.getElementById('preview-fachada-small');
      previewContainer.innerHTML = `<img src="${url}" alt="Preview Fachada">`;
    }
  };
  reader.readAsDataURL(file);
}

// Atualizar preview em tempo real (APENAS CAMPOS VISÍVEIS NO SITE)
function atualizarPreview() {
  // Nome (VISÍVEL)
  const nome = document.getElementById('nomeEstab2').value.trim() || 'Nome do Estabelecimento';
  document.getElementById('prev-nome').textContent = nome;
  document.getElementById('prev-nome-mobile').textContent = nome;
  
  // Telefone (VISÍVEL)
  const telefone = document.getElementById('telefone2').value.trim() || 'Preencha o telefone no formulário';
  document.getElementById('prev-telefone').textContent = telefone;
  
  // Sobre (VISÍVEL)
  const sobre = document.getElementById('sobre2').value.trim() || 'Adicione uma descrição sobre o estabelecimento';
  document.getElementById('prev-sobre').textContent = sobre;
  
  // Endereço completo (VISÍVEL)
  const rua = document.getElementById('rua2').value.trim();
  const numero = document.getElementById('numero2').value.trim();
  const bairro = document.getElementById('bairro2').value.trim();
  const complemento = document.getElementById('complemento2').value.trim();
  const cidadeSelect = document.getElementById('cidadeId2');
  const cidade = cidadeSelect.options[cidadeSelect.selectedIndex]?.text || 'Americana';
  const estado = 'SP';
  
  let endereco = '';
  if (rua) endereco += rua;
  if (numero) endereco += `, ${numero}`;
  
  if (bairro) endereco += ` - ${bairro}`;
  if (endereco) endereco += ` - ${cidade}/${estado}`;
  else endereco = 'Preencha o endereço no formulário';
  
  document.getElementById('prev-endereco').textContent = endereco;
  
  // Categoria (VISÍVEL)
  const categoriaSelect = document.getElementById('categoriaId2');
  const categoriaNome = categoriaSelect.options[categoriaSelect.selectedIndex]?.text || 'Bares e Restaurantes';
  document.getElementById('prev-categoria').textContent = categoriaNome;
}

// Extrair Lat/Long do Google Maps URL
function extrairLatLong() {
  const mapUrl = document.getElementById('mapurl2').value;
  
  if (!mapUrl) {
    alert('Por favor, insira a URL do Google Maps');
    return;
  }
  
  // Regex para extrair coordenadas de diferentes formatos de URL do Google Maps
  const regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const match = mapUrl.match(regex);
  
  if (match) {
    document.getElementById('latitude2').value = match[1];
    document.getElementById('longitude2').value = match[2];
    alert('✅ Coordenadas extraídas com sucesso!');
  } else {
    alert('❌ Não foi possível extrair as coordenadas. Verifique se a URL está correta.');
  }
}

// Sua função cadastrarEstabelecimento2() original permanece igual
// Apenas certifique-se de que ela usa os IDs corretos (que já estão: nomeEstab2, razaoSocial2, etc.)

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
  const modal = document.getElementById('modal-preview');
  if (e.target === modal) {
    fecharPreview();
  }
});


// Tecla ESC para fechar
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const modal = document.getElementById('modal-preview');
    if (modal && modal.classList.contains('active')) {
      fecharPreview();
    }
  }
});

buscarEstabelecimentos()

window.cadastrarEstabelecimento2 = cadastrarEstabelecimento2;
window._verTrocarImagem = _verTrocarImagem;
window._verAdicionarImagem = _verAdicionarImagem;
window._verExcluirImagem = _verExcluirImagem;
window.fecharVerEstab = fecharVerEstab;
window.ativarModoEdicao = ativarModoEdicao;
window.cancelarModoEdicao = cancelarModoEdicao;
window.salvarEdicaoUnificada = salvarEdicaoUnificada;
window.mudarViewportVer = mudarViewportVer;
window.carregarCidadesVer = carregarCidadesVer;
window.toggleMotivoVer = toggleMotivoVer;
window.fecharModalEditarVer = fecharModalEditarVer;
window.limparFiltros = limparFiltros;
window.abrirPreview = abrirPreview;
window.fecharPreview = fecharPreview;
window.previewImagem = previewImagem;
window.fecharModalEditar = fecharModalEditar;
window.voltarEstabelecimentos = voltarEstabelecimentos;
window.carregarCidades2 = carregarCidades2;
window.estabelecimentosCache = estabelecimentosCache;
window.salvarEdicaoEstabelecimento = salvarEdicaoEstabelecimento;
window.excluirEstabDoModal = excluirEstabDoModal;
window.abrirModalEditar = abrirModalEditar;
window.inicializarPaginaEstabelecimentos = inicializarPaginaEstabelecimentos;
window.atualizarPreview = atualizarPreview;

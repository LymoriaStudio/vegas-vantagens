import { getClientToken, loginToken, API_BASE, CLIENT_ID, CLIENT_SECRET } from '../../auth.js';
import {buscarEstabelecimentos,  estabelecimentosCache  } from './estabelecimentos.js'

let grupoSelecionadoId = null;

// Em grupos.js — troca reatribuição por mutação
export const gruposCache = []; // const, não let



let abaGruposAtiva = false;

const tabGrupo = document.querySelector('.grupos-tab');

tabGrupo.addEventListener('click', async () => {
  // evita recarregar se já está na aba
  if (abaGruposAtiva) {
    console.log("Aba já ativa");
    return;
  }

  abaGruposAtiva = true;

  // chama sem forçar → usa cache automaticamente
  await carregarGrupos();
});

async function deletarGrupo(grupoId) {
  // Confirmação antes de deletar
  if (!confirm("Tem certeza que deseja deletar este grupo?")) {
    return;
  }

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/Grupos/${grupoId}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      // Se der erro (provavelmente 400 ou 409 - conflito)
      throw new Error("Erro ao deletar grupo");
    }

    alert("Grupo deletado com sucesso!");
    
    // Fecha o modal se estiver aberto
    const modal = document.getElementById("modalVincularEstab");
    if (modal && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden");
    }

    // Limpa o cache e recarrega os grupos
    gruposCache = []; // Limpa o cache para forçar recarregar
    await carregarGrupos(true); // Força o recarregamento

  } catch (error) {
    console.error("Erro ao deletar grupo:", error);
    alert("Erro ao deletar, o grupo pode ter estabelecimentos vinculados!");
  }
}

export async function carregarGrupos(forcarRecarregar = false) {
  const token = localStorage.getItem("token");

  // 🔥 1. tenta carregar do localStorage se memória estiver vazia
  if (gruposCache.length === 0) {
    const cacheLocal = localStorage.getItem("gruposCache");
    if (cacheLocal) {
      try {
        const dados = JSON.parse(cacheLocal);
        gruposCache.length = 0;
        gruposCache.push(...dados);
        console.log("Cache carregado do localStorage");
      } catch (e) {
        console.warn("Erro ao parsear cache local", e);
        localStorage.removeItem("gruposCache");
      }
    }
  }

  // 🔥 2. usa cache (memória ou localStorage)
  if (gruposCache.length > 0 && !forcarRecarregar) {
    console.log("Usando grupos do cache");
    renderizarListaGrupos(gruposCache);
    return gruposCache;
  }

  try {
    console.log("Buscando grupos da API...");

    const response = await fetch(`${API_BASE}/api/Grupos/grupos-ativos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ${response.status}: ${errorText || "Erro ao buscar grupos"}`);
    }

    const grupos = await response.json();

    // 🔥 atualiza cache memória (mutação, não reatribuição)
    gruposCache.length = 0;
    gruposCache.push(...grupos);

    // 🔥 salva no localStorage
    localStorage.setItem("gruposCache", JSON.stringify(grupos));

    console.log(`${grupos.length} grupos carregados`);

    renderizarListaGrupos(gruposCache);

    return gruposCache;

  } catch (error) {
    console.error("Erro ao carregar grupos:", error);

    if (gruposCache.length > 0) {
      console.warn("Usando cache devido ao erro");
      renderizarListaGrupos(gruposCache);
      return gruposCache;
    }

    const cacheLocal = localStorage.getItem("gruposCache");
    if (cacheLocal) {
      try {
        const dados = JSON.parse(cacheLocal);
        gruposCache.length = 0;
        gruposCache.push(...dados);
        console.warn("Usando cache do localStorage");
        renderizarListaGrupos(gruposCache);
        return gruposCache;
      } catch {}
    }

    alert("Não foi possível carregar os grupos.");
    return [];
  }
}

async function garantirEstabelecimentosNoCache() {
  if (estabelecimentosCache.length > 0) {
    return estabelecimentosCache;
  }

  await buscarEstabelecimentos();
  return estabelecimentosCache;
}

async function abrirModalVincular(grupoId) {
  grupoSelecionadoId = grupoId;

  document.getElementById("modalVincularEstab").classList.remove("hidden");

  const listaVinculados = document.getElementById("listaEstabVinculados");
  const listaDisponiveis = document.getElementById("listaEstabModal");
  const vincHeader = document.querySelector(".modal-gp-header");
  vincHeader.innerHTML = ""

// Cria o botão
const btnDelete = document.createElement("button");
btnDelete.innerHTML = `
  <img src="./imgs/trash-02.png" alt="Deletar">
`;
btnDelete.type = "button";
btnDelete.className = "btn-icon-deletar-grupo";
btnDelete.title = "Deletar grupo";
btnDelete.onclick = () => deletarGrupo(grupoId);

// Adiciona ao header
vincHeader.appendChild(btnDelete);

  listaVinculados.innerHTML = "Carregando...";
  listaDisponiveis.innerHTML = "Carregando...";

  try {
    // garante cache
    const todos = await garantirEstabelecimentosNoCache();

    // busca os já vinculados
    const vinculados = await buscarEstabelecimentosDoGrupo(grupoId);

    const idsVinculados = vinculados.map(e => e.id);



    /* =========================
       LISTA DE JÁ VINCULADOS
    ========================== */

    if (!vinculados || vinculados.length === 0) {
      listaVinculados.innerHTML =
        "<p class='empty-text'>Nenhum estabelecimento cadastrado nesse grupo.</p>";
    } else {
      listaVinculados.innerHTML = "";
      vinculados.forEach(estab => {
        const div = document.createElement("div");
        div.className = "item-checkbox";
        div.innerHTML = `<span>${estab.nome}</span>`;
        listaVinculados.appendChild(div);
      });
    }

    /* =========================
       LISTA DE DISPONÍVEIS
    ========================== */

    const disponiveis = todos.filter(
      e => !idsVinculados.includes(e.id)
    );

    if (disponiveis.length === 0) {
      listaDisponiveis.innerHTML =
        "<p class='empty-text'>Nenhum estabelecimento disponível.</p>";
      return;
    }

    listaDisponiveis.innerHTML = "";
    disponiveis.forEach(estab => {
      const div = document.createElement("div");
      div.className = "item-checkbox";
      div.innerHTML = `
        <label>
          <input type="checkbox" value="${estab.id}">
          ${estab.nome}
        </label>
      `;
      listaDisponiveis.appendChild(div);
    });

  } catch (err) {
    console.error(err);
    listaVinculados.innerHTML = "Erro ao carregar dados.";
    listaDisponiveis.innerHTML = "";
  }
}

function fecharModalVincular() {
  document.getElementById("modalVincularEstab").classList.add("hidden");
  grupoSelecionadoId = null;
}

// ========== VINCULAR ESTABELECIMENTOS (com atualização de cache) ==========
async function confirmarVinculo() {
  if (!grupoSelecionadoId) return;

  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  const selecionados = [
    ...document.querySelectorAll("#listaEstabModal input[type='checkbox']:checked")
  ].map(cb => cb.value);

  if (selecionados.length === 0) {
    alert("Selecione ao menos um estabelecimento.");
    return;
  }

  try {
    await Promise.all(
      selecionados.map(estabId =>
        fetch(
          `${API_BASE}/api/Grupos/${grupoSelecionadoId}/vincular-estabelecimentos/${estabId}`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token
            }
          }
        ).then(res => {
          if (!res.ok) {
            throw new Error("Erro ao vincular estabelecimento " + estabId);
          }
        })
      )
    );

    alert("Estabelecimentos vinculados com sucesso!");
    fecharModalVincular();
    
    // 🔹 LIMPA O CACHE E RECARREGA
    limparCacheGrupos();
    await carregarGrupos(true);

  } catch (err) {
    console.error(err);
    alert("Erro ao vincular um ou mais estabelecimentos.");
  }
}

// ========== RENDERIZAR LISTA DE GRUPOS ==========
function renderizarListaGrupos(grupos) {

  popularEstabelecimentosParaGrupo() 
  const container = document.getElementById("listaGrupo");
  if (!container) return;

  container.innerHTML = "";

  if (!grupos || grupos.length === 0) {
    container.innerHTML = "<p>Nenhum grupo encontrado.</p>";
    return;
  }

  container.classList.add("grupo-wrapper");
  const PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg==';



  grupos.forEach(grupo => {
    const logo = grupo.logoCaminho
      ? `${API_BASE}${grupo.logoCaminho}`
      : PLACEHOLDER;

    const card = document.createElement("div");
    card.className = "grupo-card";

    card.innerHTML = `
      <div class="grupo-logo">
        <img src="${logo}" alt="Logo ${grupo.nome}"
             onerror="this.src='${PLACEHOLDER}'">
      </div>

      <div class="grupo-info">
        <h4>${grupo.nome}</h4>

        ${grupo.siteURL
          ? `<a href="${grupo.siteURL}" target="_blank">Site</a>`
          : `<span class="site-placeholder">Sem site</span>`}

        <span class="grupo-count">
          ${grupo.estabelecimentosCount || 0} estabelecimentos
        </span>
      </div>

      <div class="grupo-actions">
        <button onclick="abrirModalVincular(${grupo.id})">
          Ver Mais
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

// ========== LIMPAR CACHE DE GRUPOS ==========
function limparCacheGrupos() {
  gruposCache = [];
  console.log("Cache de grupos limpo");
}

// ========== POPULAR SELECT DE GRUPOS (usando cache) ==========
export async function popularSelectGrupos(selectId = "grupo2") {
  try {
    // Se não tem cache, carrega
    if (gruposCache.length === 0) {
      await carregarGrupos();
    }

    const select = document.getElementById(selectId);
    if (!select) {
      console.warn(`Select #${selectId} não encontrado`);
      return;
    }

    select.innerHTML = '<option value="">Selecione</option>';

    gruposCache.forEach(grupo => {
      const option = document.createElement("option");
      option.value = grupo.id;
      option.textContent = grupo.nome;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao popular select de grupos:", error);
  }
}

// ========== CADASTRAR GRUPO (com atualização de cache) ==========
async function cadastrarGrupo() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Você precisa estar logado.");
    return;
  }

  const nome = document.getElementById("nomeGrupo").value.trim();
  if (!nome) {
    alert("O nome do grupo é obrigatório.");
    return;
  }

  const formData = new FormData();
  
  formData.append("Nome", nome);
  formData.append("SiteURL", document.getElementById("siteUrlGrupo").value.trim());
  formData.append("Ativo", document.getElementById("ativoGrupo").checked);

  const logoFile = document.getElementById("logoGrupo").files[0];
  if (logoFile) {
    formData.append("LogoCaminho", logoFile);
  }

  const estabelecimentosIds = obterEstabelecimentosSelecionados();
  estabelecimentosIds.forEach(id => {
    formData.append("EstabelecimentosIds", id);
  });

  try {
    const response = await fetch(`${API_BASE}/api/Grupos/criar`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const erro = await response.text();
      console.error("Erro ao criar grupo:", response.status, erro);
      throw new Error(erro || `Erro ${response.status} ao criar grupo`);
    }

    const grupo = await response.json();
    
    alert("Grupo cadastrado com sucesso!");
    document.getElementById("formCadastroGrupo").reset();
    
    // 🔹 Aguarda um pouco antes de recarregar (dá tempo do backend processar)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 🔹 LIMPA O CACHE E RECARREGA
    limparCacheGrupos();
    await carregarGrupos(true); // força recarregar
    
    // Volta para a lista de grupos usando o gerenciador
    if (gerenciadores.estabelecimentos) {
      gerenciadores.estabelecimentos.voltarPara("lista-grupo");
    }

  } catch (error) {
    console.error("Erro detalhado:", error);
    
    if (error.message.includes("Failed to fetch")) {
      alert("Erro de conexão ao cadastrar grupo. Verifique se o servidor está acessível.");
    } else {
      alert("Erro ao cadastrar grupo: " + error.message);
    }
  }
}

async function buscarEstabelecimentosDoGrupo(grupoId) {
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(
      `${API_BASE}/api/Grupos/${grupoId}/estabelecimentos-por-grupo`,
      {
        headers: { Authorization: "Bearer " + token }
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Erro ao buscar estabelecimentos:", res.status, errorText);
      throw new Error(`Erro ${res.status}: ${errorText || "Erro ao buscar estabelecimentos do grupo"}`);
    }

    return await res.json();
    
  } catch (error) {
    console.error("Erro ao buscar estabelecimentos do grupo:", error);
    throw error;
  }
}

// ========== POPULAR ESTABELECIMENTOS PARA GRUPO ==========
async function popularEstabelecimentosParaGrupo() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("listaEstabelecimentosGrupo");
  
  container.innerHTML = '<p>Carregando...</p>';

  try {
    const response = await fetch(`${API_BASE}/api/Estabelecimentos`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Erro ao buscar estabelecimentos");
    }

    const estabelecimentos = await response.json();
    container.innerHTML = "";

    if (!estabelecimentos || estabelecimentos.length === 0) {
      container.innerHTML = "<p>Nenhum estabelecimento disponível.</p>";
      return;
    }

    estabelecimentos.forEach(estab => {
      const checkboxWrapper = document.createElement("div");
      checkboxWrapper.className = "checkbox-item";
      
      checkboxWrapper.innerHTML = `
        <label>
          <input type="checkbox" value="${estab.id}" class="estab-checkbox">
          ${estab.nome}
        </label>
      `;
      
      container.appendChild(checkboxWrapper);
    });

  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Erro ao carregar estabelecimentos.</p>";
  }
}

window.onload = async () => {
  
  const btnMapa = document.querySelector(".btn-map");
  const map = document.getElementById("mapurl");

  document.querySelector('[data-open-subpage="lista-grupo"]')
  .addEventListener("click", () => {
    carregarGrupos();
    popularEstabelecimentosParaGrupo() 
  });


  if (btnMapa && map) {
    btnMapa.addEventListener("click", () => {
      const coordenadas = extrairLatLngGoogleMaps(map.value);
      if (!coordenadas) return;

      document.querySelector(".lat").value = coordenadas.latitude;
      document.querySelector(".long").value = coordenadas.longitude;
    });
  }
};

window.carregarGrupos = carregarGrupos;
window.cadastrarGrupo = cadastrarGrupo;
window.deletarGrupo = deletarGrupo;
window.popularEstabelecimentosParaGrupo = popularEstabelecimentosParaGrupo;
window.confirmarVinculo = confirmarVinculo;
window.abrirModalVincular = abrirModalVincular;
window.fecharModalVincular = fecharModalVincular;
window.renderizarListaGrupos  = renderizarListaGrupos;

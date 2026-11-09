
import "./paineladmin/estabelecimentos.js";
import "./paineladmin/cupomPainel.js";
import "./paineladmin/grupos.js";
import "./paineladmin/grafico.js";



class GerenciadorSubPages {
  constructor(pageElement) {
    this.page = pageElement;
    this.hierarquia = {}; // Cada página pode ter sua própria hierarquia
    this.init();
  }
  
  init() {
    this.page.querySelectorAll("[data-open-subpage]").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const nomeSubpage = btn.dataset.openSubpage;
        
        // Se for botão de voltar, usa o método voltarPara
        if (btn.classList.contains("btn-voltar")) {
          e.preventDefault();
          this.voltarPara(nomeSubpage);
          return;
        }
        
        // Caso contrário, troca normalmente
        this.trocarSubPage(btn);
      });
    });
  }
  
  trocarSubPage(btn) {
    const nomeSubpage = btn.dataset.openSubpage;
    
    // Remove active de todos os botões principais desta página
    this.page.querySelectorAll(".btns-subpage [data-open-subpage]")
      .forEach(b => b.classList.remove("active"));
    
    // Verifica se é uma subpage filha
    const paginaPai = this.hierarquia[nomeSubpage];
    
    if (paginaPai) {
      // Se é filha, ativa o botão pai
      this.page.querySelector(`[data-open-subpage="${paginaPai}"]`)
        ?.classList.add("active");
    } else {
      // Se não é filha, ativa o próprio botão
      btn.classList.add("active");
    }
    
    this.abrirSubPage(nomeSubpage);
  }
  
  abrirSubPage(nome) {
    // Fecha todas as subpages DESTA página
    this.page.querySelectorAll(".sub-page")
      .forEach(sp => sp.classList.remove("active"));
    
    // Abre a subpage desejada
    const subpage = this.page.querySelector(`.sub-page[data-subpage="${nome}"]`);
    if (!subpage) {
      console.warn("Subpage não encontrada:", nome);
      return;
    }
    subpage.classList.add("active");
  }
  
  // Método público para ser chamado de fora
  voltarPara(nomeSubpage) {
    this.abrirSubPage(nomeSubpage);
    // Reativa o botão correspondente
    const btn = this.page.querySelector(`[data-open-subpage="${nomeSubpage}"]`);
    if (btn) {
      this.page.querySelectorAll(".btns-subpage [data-open-subpage]")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
  }
  
  // Setter para hierarquia
  setHierarquia(hierarquia) {
    this.hierarquia = hierarquia;
  }
}

// ========== INICIALIZAÇÃO ==========
const gerenciadores = {};

document.querySelectorAll(".page").forEach(page => {
  const pageId = page.dataset.page;
  gerenciadores[pageId] = new GerenciadorSubPages(page);
});


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


//MAPA URL

function extrairLatLngGoogleMaps(url) {
  if (!url || typeof url !== "string") return null;

  // Padrão: @lat,lng
  const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
  const matchAt = url.match(regexAt);

  if (matchAt) {
    return {
      latitude: parseFloat(matchAt[1]),
      longitude: parseFloat(matchAt[2]),
    };
  }

  // Fallback: !3dLAT!4dLNG
  const regexFallback = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
  const matchFallback = url.match(regexFallback);

  if (matchFallback) {
    return {
      latitude: parseFloat(matchFallback[1]),
      longitude: parseFloat(matchFallback[2]),
    };
  }

  return null;
}

const map = document.getElementById("mapurl2");
const btnMapa = document.querySelector(".btn-map");

btnMapa.addEventListener("click", () => {
  const url = map.value;
  const coordenadas = extrairLatLngGoogleMaps(url);

  if (!coordenadas) {
    console.log("Coordenadas não encontradas");
    return;
  }
  
  document.querySelector(".latitude2").value = coordenadas.latitude
  document.querySelector(".longitude2").value = coordenadas.longitude

  console.log("Latitude:", coordenadas.latitude);
  console.log("Longitude:", coordenadas.longitude);
});






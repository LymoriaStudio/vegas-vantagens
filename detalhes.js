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



async function fetchStoreDetails(token, storeId) {
  const resp = await fetch(`${API_BASE}/api/Estabelecimentos/${storeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!resp.ok) throw new Error("Falha ao buscar estabelecimento");
  return await resp.json();
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


document.addEventListener("DOMContentLoaded", async () => {
  const hash = decodeURIComponent(window.location.hash).slice(1);
  const idMatch = hash.match(/^store-(\d+)$/);

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

    mostrarCuponsDoEstabelecimento(loja);

    document.querySelectorAll('.title-comercio').forEach(el => {
      el.textContent = loja.nome;
    });

    const addressEl = document.querySelector(".adress");
    if (addressEl) addressEl.textContent = `${loja.rua}, ${loja.numero}, ${loja.bairro} - ${loja.cidade}`;

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
        img.src = loja.imagens[0];
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
        img.src = loja.imagemPrincipal;
      });
    }

    const tagEl = document.querySelector(".tag-comercio");
    if (tagEl && loja.categorias?.length > 0) {
      const categoria = loja.categorias[0];
      tagEl.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    }

  } catch (err) {
    console.error("Erro ao buscar detalhes da loja:", err.message);
  } finally {
    hideGlobalLoader();
  }
});


function mostrarCuponsDoEstabelecimento(estabelecimento) {
  const nomeEstabelecimento = normalizarTexto(estabelecimento.nome);

  const todosCupons = document.querySelectorAll('article.coupon-card');
  const todosModais = document.querySelectorAll('dialog.coupon-modal');

  let encontrouAlgum = false;

  todosCupons.forEach(cupom => {
    const nomeCupom = normalizarTexto(cupom.dataset.cupom || '');
    const corresponde = nomeEstabelecimento.includes(nomeCupom) && nomeCupom !== '';

    cupom.style.display = corresponde ? 'flex' : 'none';
    if (corresponde) encontrouAlgum = true;

    console.log('cupom:', nomeCupom, '| corresponde:', corresponde, '| loja:', nomeEstabelecimento);
  });




}

// Função utilitária
function normalizarTexto(texto) {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}




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

(function () {
  // Delegação para suportar cartões adicionados depois
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.coupon-cta');
    if (!btn) return;

    const alvo = btn.dataset.target; // "zanini", "caochorro", etc.
    if (!alvo) return;

    const modal = document.querySelector(`dialog.coupon-modal[data-modal="${alvo}"]`);
    if (!modal) {
      console.warn('Modal não encontrado para', alvo);
      return;
    }

    // IMPORTANTE: se algum filtro deixou 'display:none' inline, limpa
    if (modal.style.display === 'none') {
      modal.style.display = '';
    }

    // Abre com segurança
    try {
      if (typeof modal.showModal === 'function') {
        modal.showModal();
      } else {
        // Fallback p/ navegadores sem <dialog>
        modal.setAttribute('open', '');
      }
    } catch (err) {
      // showModal lança erro se o dialog estiver dentro de <form> sem method=dialog em alguns casos
      console.error('Falha ao abrir modal:', err);
      modal.setAttribute('open', '');
    }

    // Bind do fechar (só uma vez)
    const closeBtn = modal.querySelector('.cm-close');
    if (closeBtn && !closeBtn.dataset.bound) {
      closeBtn.addEventListener('click', () => {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      });
      closeBtn.dataset.bound = '1';
    }
  });

  // Fechar no backdrop (clique fora)
  document.querySelectorAll('dialog.coupon-modal').forEach((modal) => {
    // Garante que todo dialog tenha z-index alto (sobrepõe o resto)
    modal.style.zIndex = modal.style.zIndex || '9999';

    modal.addEventListener('click', (e) => {
      // Em <dialog>, e.target === modal significa clique fora do conteúdo
      if (e.target === modal) {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      }
    });

    // ESC já fecha nativamente (event cancel), deixe default
  });
})();



 

(() => {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const initRail = (rail) => {
    if (!rail || rail.dataset.csReady === "1") return;
    rail.dataset.csReady = "1";

    const track = rail.querySelector('.coupon-grid');
    const bar   = rail.querySelector('.cs-progress');
    const thumb = bar ? bar.querySelector('.cs-thumb') : null;
    if (!track) return;

    const updateBar = () => {
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







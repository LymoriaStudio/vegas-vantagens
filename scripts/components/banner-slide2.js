const slide11 = document.getElementById('slide11');
const slide22 = document.getElementById('slide22');
const slide33 = document.getElementById('slide33');
const slide44 = document.getElementById('slide44');
const slide55 = document.getElementById('slide55');
const slide66 = document.getElementById('slide66');
const slide77 = document.getElementById('slide77');
const slide88 = document.getElementById('slide88');
const slidesContainer1 = document.querySelector('.slides1');
const bullets1 = document.querySelectorAll('.bullet1');

// <<< MAPA opcional por data-base (fallback se não houver data-href na imagem)
const routesByBase1 = {
  FARMACIA: 'farmacia.html',
  FGTS: '/campanhas/fgts',
  MEDIQUO: '/campanhas/mediquo',
};


let currentSlide1 = 1;
let autoPlayInterval1;

// Executa ao carregar
document.addEventListener("DOMContentLoaded", () => {
  atualizarSrcDasImagens1();
});

// Tamanhos do banner
function getBannerSize1() {
  const width = window.innerWidth;
  if (width >= 1440) return '1520X450';
  if (width >= 1024) return '1232X365';
  if (width >= 768) return '768X360';
  if (width >= 480) return '402X520';
  return '402X520';
}

// Executa ao carregar
document.addEventListener("DOMContentLoaded", () => {
  atualizarSrcDasImagens1();

  // <<< habilita clique nas imagens
  enableSlideLinks1();
});

// <<< função que ativa os links dos slides (sem <a>)
function enableSlideLinks1() {
  // delegação no container (não quebra seu layout)
  slidesContainer1.addEventListener('click', (e) => {
    const img = e.target.closest('img'); // clicou numa <img>?
    if (!img || !slidesContainer1.contains(img)) return;

    // 1) tenta data-href na própria imagem
    let href = img.dataset.href?.trim();

    // 2) se não tiver, usa o mapa por data-base
    if (!href) {
      const base = (img.dataset.base || '').toUpperCase();
      href = routesByBase1?.[base]?.trim();
    }

    // 🚫 Se não tiver link, não faz nada
    if (!href) return;

    // Redireciona (mesma aba)
    window.location.href = href;
  });

  // ♿ Acessibilidade + cursor SOMENTE para imagens com link
  document.querySelectorAll('.slides1 img').forEach(img => {
    const hasHref =
      (img.dataset.href && img.dataset.href.trim() !== '') ||
      (routesByBase1?.[(img.dataset.base || '').toUpperCase()]);

    if (hasHref) {
      img.style.cursor = 'pointer';
      img.tabIndex = 0; // permite foco no teclado
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          img.click();
        }
      });
    } else {
      img.style.cursor = 'default';
      img.removeAttribute('tabIndex');
    }
  });
}

// Remove acentos
function formatFileName1(str) {
  return str.replace(/ /g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, '');
}

// Atualiza imagens responsivas
function atualizarSrcDasImagens1() {
  const slides = document.querySelectorAll('.slides1 img');
  const tamanho = getBannerSize1();

  slides.forEach(img => {
    const base = formatFileName1(img.getAttribute('data-base'));
    const folder = img.getAttribute('data-folder');
    img.src = `./imgs/banners/${folder}/${base}_${tamanho}.png?v=12`;

    img.onerror = () => {
      img.src = `./imgs/banners/${folder}/${base}_${tamanho}.jpg?v=12`;
    };
  });
}

// Atualiza a posição dos slides
function updateSlidePosition1() {
  const index = currentSlide1 - 1;
  slidesContainer1.style.transform = `translateX(-${index * 12.5}%)`; // 8 slides = 100/8
}

// Atualiza bullets
function updateBulletClasses1() {
  bullets1.forEach((bullet, index) => {
    bullet.classList.toggle('bullet-ativo', index + 1 === currentSlide1);
  });
}

// Autoplay com 7 slides
function startAutoplay1() {
  autoPlayInterval1 = setInterval(() => {
    currentSlide1 = currentSlide1 % 8 + 1;
    document.getElementById(`slide${currentSlide1}${currentSlide1}`).checked = true;
    updateSlidePosition1();
    updateBulletClasses1();
  }, 15000);
}

function stopAutoplay1() {
  clearInterval(autoPlayInterval1);
}

// Eventos manuais
slide11.addEventListener('change', () => {
  currentSlide1 = 1;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide22.addEventListener('change', () => {
  currentSlide1 = 2;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide33.addEventListener('change', () => {
  currentSlide1 = 3;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide44.addEventListener('change', () => {
  currentSlide1 = 4;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide55.addEventListener('change', () => {
  currentSlide1 = 5;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide66.addEventListener('change', () => {
  currentSlide1 = 6;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide77.addEventListener('change', () => {
  currentSlide1 = 7;
  updateSlidePosition1();
  updateBulletClasses1();
});
slide88.addEventListener('change', () => {
  currentSlide1 = 8;
  updateSlidePosition1();
  updateBulletClasses1();
});

// Botões
const btnLeft1 = document.querySelector('.btn-left1');
const btnRight1 = document.querySelector('.btn-right1');

btnLeft1.addEventListener('click', () => {
  currentSlide1 = currentSlide1 === 1 ? 8 : currentSlide1 - 1;
  document.getElementById(`slide${currentSlide1}${currentSlide1}`).checked = true;
  updateSlidePosition1();
  updateBulletClasses1();
});

btnRight1.addEventListener('click', () => {
  currentSlide1 = currentSlide1 === 8 ? 1 : currentSlide1 + 1;
  document.getElementById(`slide${currentSlide1}${currentSlide1}`).checked = true;
  updateSlidePosition1();
  updateBulletClasses1();
});

// Inicializa
updateSlidePosition1();
updateBulletClasses1();
startAutoplay1();

  const wrapper = document.querySelector('.wrapper-reviews');
  const slides = Array.from(wrapper.children);
  const gap = 20;

  // Duplica slides no início e no fim para simular o loop
  slides.forEach(slide => {
    const clone = slide.cloneNode(true);
    wrapper.appendChild(clone);
  });
  slides.forEach(slide => {
    const clone = slide.cloneNode(true);
    wrapper.insertBefore(clone, wrapper.firstChild);
  });

  const allSlides = document.querySelectorAll('.wrapper-reviews img');
  let index = slides.length; // começa na "primeira cópia real"
  let transitioning = false;

  function getSizes() {
    const visibleWidth = document.querySelector('.reviews-prod').offsetWidth;
    const cardWidth = allSlides[0].offsetWidth;
    return { visibleWidth, cardWidth };
  }

  function showSlide(noTransition = false) {
    const { visibleWidth, cardWidth } = getSizes();
    const offset = (cardWidth + gap) * index - (visibleWidth - cardWidth) / 2;

    if (noTransition) wrapper.style.transition = "none";
    else wrapper.style.transition = "transform 0.8s ease-in-out";

    wrapper.style.transform = `translateX(-${offset}px)`;

    // destaca o card ativo
    allSlides.forEach((img, i) =>
      img.classList.toggle('active', i === index)
    );
  }

  function nextSlide() {
    if (transitioning) return;
    transitioning = true;

    index++;
    showSlide();

    // Quando chegar no final das cópias, reseta instantaneamente
    setTimeout(() => {
      if (index >= allSlides.length - slides.length) {
        index = slides.length;
        showSlide(true);
      }
      transitioning = false;
    }, 850);
  }

  showSlide(true); // mostra o primeiro corretamente

  let interval = setInterval(nextSlide, 7000);

  // Recalcula no resize
  window.addEventListener('resize', () => showSlide(true));

  /*
  document.querySelector('.reviews-prod').addEventListener('mouseenter', () => clearInterval(interval));
  document.querySelector('.reviews-prod').addEventListener('mouseleave', () => {
    interval = setInterval(nextSlide, 4000);
  });

  */

const bannersP = document.querySelector(".hero-prod")
  document.addEventListener("DOMContentLoaded", () => {

  enableSlideLinks3();

});

// <<< função que ativa os links dos slides (sem <a>)
function enableSlideLinks3() {
  // delegação no container (não quebra seu layout)
  bannersP.addEventListener('click', (e) => {
    const img = e.target.closest('img'); // clicou numa <img>?
    if (!img || !bannersP.contains(img)) return;

    // 1) tenta data-href na própria imagem
    let href = img.dataset.href?.trim();

    

    // 🚫 Se não tiver link, não faz nada
    if (!href) return;

    // Redireciona (mesma aba)
    window.location.href = href;
  });

  // ♿ Acessibilidade + cursor SOMENTE para imagens com link
  document.querySelectorAll('.hero-prod img').forEach(img => {
    const hasHref =
      (img.dataset.href && img.dataset.href.trim() !== '')

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

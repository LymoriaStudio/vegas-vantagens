function montarCarrossel() {
  const track = document.getElementById('track');
  const carrossel = document.getElementById('carrossel');

  if (!track) return;

  // Lista manual de parceiros com ID e imagem
 const parceiros = [
  { link: 'detalhes.html#store-3',    src: './imgs/logos/logo-zanini.png', nome: 'Parceiro 1' },
  { link: 'detalhes.html#store-5',    src: './imgs/logos/boi-logo.png',    nome: 'Parceiro 2' },
  { link: 'detalhes.html#store-6',    src: './imgs/logos/beta-logo.png',   nome: 'Parceiro 3' },
  { link: 'detalhes.html#store-7',                        src: './imgs/logos/caochorro-logo.png', nome: 'Parceiro 4' },
  { link: './farmacia.html', src: './imgs/logos/raia-logo.png',    nome: 'Parceiro 5' },
  { link: 'https://app.lincredfacil.com.br/antecipacao-fgts-vegas/?utm_source=lnc_app_lp_vegas&utm_medium=botao&utm_campaign=vegas_fgts',                        src: './imgs/logos/lincred-logo.png', nome: 'Parceiro 6' },
  { link: './farmacia.html',                        src: './imgs/logos/drogasil-logo.png', nome: 'Parceiro 7' },
  { link: './totalpass.html',                        src: './imgs/logos/totalpass.png',    nome: 'Parceiro 8' },
  { link: './mediquo.html',                        src: './imgs/logos/logo-med.png',     nome: 'Parceiro 9' },
  { link: './wellhub.html',                        src: './imgs/logos/wellhub-logo.png', nome: 'Parceiro 10' },
  { link: 'detalhes.html#store-28',                        src: './imgs/logos/intensos-logo.png',    nome: 'Parceiro 11' },
  { link: 'detalhes.html#store-27',                        src: './imgs/logos/vidrovan-logo.png',     nome: 'Parceiro 12' },
  { link: 'detalhes.html#store-26',                        src: './imgs/logos/mercadao-logo.png', nome: 'Parceiro 13' },


];

track.innerHTML = "";

parceiros.forEach(parceiro => {
  const link = document.createElement('a');

  if (parceiro.link) {
    link.href = parceiro.link;
  } else {
    // Evita redirecionar se o link estiver vazio
    link.href = 'javascript:void(0)';
    link.style.cursor = 'default';
  }

  const img = document.createElement('img');
  img.src = parceiro.src;
  img.alt = `Logo ${parceiro.nome}`;
  img.loading = "lazy";
  

  link.appendChild(img);
  track.appendChild(link);
  img.onerror = () => { img.src = 'src/imgs/parceiros/default-image.png'; };

});

  const isMobile = window.innerWidth <= 650;
  const minItens = isMobile ? 2 : 3;

  if (parceiros.length > minItens) {
    // DUPLICA para efeito infinito
    track.innerHTML += track.innerHTML;
    track.classList.add('animate-scroll');

    
    let animationId;
    let speed = 10; // tente valores maiores ou menores
let posX = 0;

function animate() {
  posX -= speed;
  if (Math.abs(posX) >= track.scrollWidth / 2) {
    posX = 0;
  }
  track.style.transform = `translateX(${posX}px)`;
  requestAnimationFrame(animate);
}

animate();


    carrossel.addEventListener('mouseenter', () => cancelAnimationFrame(animationId));
    carrossel.addEventListener('mouseleave', () => animate());
  } else {
    track.style.transform = 'translateX(0)';
    track.classList.remove('animate-scroll');
    track.style.animation = 'none';
    track.style.justifyContent = 'flex-start';
  }
}

document.addEventListener("DOMContentLoaded", montarCarrossel);

const categoriaCards = document.querySelectorAll('.card-categoria');
  const descontoCards   = document.querySelectorAll('.card-desconto');

  function resetFiltragem() {
    categoriaCards.forEach(c => c.classList.remove('active'));
    descontoCards.forEach(d => d.classList.remove('hidden'));
  }

  const cardsDesc = document.querySelector(".cards-descontos")

  function filtrarPorCategoria(cat) {
    resetFiltragem();
    // destaca categoria
    const clicked = document.querySelector(`.card-categoria[data-cat="${cat}"]`);
    if (clicked) {
      clicked.classList.add('active');
      cardsDesc.classList.add('classify-cards')

    } 

    // filtra descontos
    descontoCards.forEach(d => {
      if (d.dataset.tag !== cat) d.classList.add('hidden');
    });
  }

  // listener em cada categoria
 categoriaCards.forEach(catCard => {
  catCard.addEventListener('click', (e) => {
    e.preventDefault(); // caso algum clique em link
    const cat = catCard.dataset.cat;
    if (location.hash !== `#${cat}`) {
      location.hash = cat; // Isso vai acionar o hashchange depois
    } else {
      // se o hash já for o mesmo, ainda assim forçamos o filtro
      filtrarPorCategoria(cat);
    }
  });
});

  // reage a mudanças de hash (back/forward e direto na URL)
  window.addEventListener('hashchange', () => {
    const cat = location.hash.replace('#','');
    if (cat) filtrarPorCategoria(cat);
    else resetFiltragem();
  });

  // ao carregar a página, aplica filtro do hash (se houver)
  window.addEventListener('DOMContentLoaded', () => {
    const cat = location.hash.replace('#','');
    if (cat) filtrarPorCategoria(cat);
  });




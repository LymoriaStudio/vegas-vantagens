// Loader do painel admin (paineladmin.html).
// Controla o overlay #modalLoader já presente no HTML; o CSS em
// styles/paineladmin.css mostra o overlay quando ele tem a classe .active.

export function mostrarLoader(texto = "Carregando...", subtexto = "Aguarde um momento") {
  const loader = document.getElementById("modalLoader");
  if (!loader) return;

  const elTexto = loader.querySelector(".loader-text");
  const elSubtexto = loader.querySelector(".loader-subtext");
  if (elTexto) elTexto.textContent = texto;
  if (elSubtexto) elSubtexto.textContent = subtexto;

  loader.classList.add("active");
}

export function ocultarLoader() {
  document.getElementById("modalLoader")?.classList.remove("active");
}

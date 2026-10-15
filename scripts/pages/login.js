import { getClientToken, loginToken, API_BASE, CLIENT_ID, CLIENT_SECRET } from '../auth.js';

function fazerLogin() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  fetch(`${API_BASE}/api/Auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        localStorage.setItem("token", data.token);
        alert("Login feito com sucesso!");
        window.location.href = "admin.html";
      } else {
        alert("Falha no login. Verifique os dados.");
        console.error(data);
      }
    })
    .catch(err => {
      alert("Erro ao fazer login.");
      console.error(err);
    });
}

function cadastrarEstabelecimento() {
  const nome = document.getElementById("nomeEstab").value;
  const ativo = document.getElementById("ativoEstab").checked;
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Você precisa estar logado para cadastrar.");
    return;
  }

  fetch(`${API_BASE}/api/Estabelecimento`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ nome, ativo })
  })
    .then(res => {
      if (!res.ok) throw new Error("Erro ao cadastrar estabelecimento: " + res.status);
      return res.json();
    })
    .then(data => {
      alert("Estabelecimento cadastrado com sucesso!");
      document.getElementById("nomeEstab").value = "";
      document.getElementById("ativoEstab").checked = true;
    })
    .catch(err => {
      alert("Erro: " + err.message);
      console.error(err);
    });
}

// Torna as funções acessíveis globalmente, se necessário
window.fazerLogin = fazerLogin;
window.cadastrarEstabelecimento = cadastrarEstabelecimento;

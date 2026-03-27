import { API_BASE_URL } from "./config.js";

const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const senhaInput = document.getElementById("senha");
const loginMensagem = document.getElementById("loginMensagem");

const token = localStorage.getItem("token");
if (token) {
  window.location.href = "./dashboard.html";
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginMensagem.textContent = "";
  const username = usernameInput.value.trim();
  const senha = senhaInput.value.trim();

  if (!username || !senha) {
    loginMensagem.textContent = "Preencha usuário e senha.";
    return;
  }

  try {
    const resposta = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, senha })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      loginMensagem.textContent = dados.erro || "Falha no login.";
      return;
    }

    localStorage.setItem("token", dados.token);
    localStorage.setItem("usuario", JSON.stringify(dados.usuario));

    window.location.href = "./dashboard.html";
  } catch (error) {
    loginMensagem.textContent = "Erro ao conectar com o servidor.";
  }
});
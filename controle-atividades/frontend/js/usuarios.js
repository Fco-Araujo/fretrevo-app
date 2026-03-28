import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuarioLogado = JSON.parse(localStorage.getItem("usuario"));

if (!token) {
  window.location.href = "./index.html";
}

if (!usuarioLogado || usuarioLogado.perfil !== "admin") {
  alert("Acesso restrito.");
  window.location.href = "./dashboard.html";
}

const boasVindasUsuarios = document.getElementById("boasVindasUsuarios");
const tabelaUsuarios = document.getElementById("tabelaUsuarios");
const logoutBtn = document.getElementById("logoutBtn");
const recarregarUsuariosBtn = document.getElementById("recarregarUsuariosBtn");

const abrirModalUsuarioBtn = document.getElementById("abrirModalUsuarioBtn");
const fecharModalUsuarioBtn = document.getElementById("fecharModalUsuarioBtn");
const cancelarModalUsuarioBtn = document.getElementById("cancelarModalUsuarioBtn");
const modalUsuarioOverlay = document.getElementById("modalUsuarioOverlay");

const usuarioForm = document.getElementById("usuarioForm");
const modalUsuarioTitulo = document.getElementById("modalUsuarioTitulo");
const salvarUsuarioBtn = document.getElementById("salvarUsuarioBtn");
const usuarioMensagem = document.getElementById("usuarioMensagem");

const usuarioNome = document.getElementById("usuarioNome");
const usuarioUsername = document.getElementById("usuarioUsername");
const usuarioPerfil = document.getElementById("usuarioPerfil");
const usuarioAtivo = document.getElementById("usuarioAtivo");
const usuarioSenha = document.getElementById("usuarioSenha");

let usuariosCache = [];
let modoEdicao = false;
let usuarioEditandoId = null;

boasVindasUsuarios.textContent = `Bem-vindo, ${usuarioLogado?.nome || "usuário"}`;

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

abrirModalUsuarioBtn.addEventListener("click", () => {
  prepararModalNovoUsuario();
  modalUsuarioOverlay.classList.remove("hidden");
});

fecharModalUsuarioBtn.addEventListener("click", fecharModalUsuario);
cancelarModalUsuarioBtn.addEventListener("click", fecharModalUsuario);

modalUsuarioOverlay.addEventListener("click", (event) => {
  if (event.target === modalUsuarioOverlay) {
    fecharModalUsuario();
  }
});

recarregarUsuariosBtn.addEventListener("click", carregarUsuarios);

usuarioForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  usuarioMensagem.textContent = "";

  const payload = {
    nome: usuarioNome.value.trim(),
    username: usuarioUsername.value.trim(),
    perfil: usuarioPerfil.value,
    ativo: usuarioAtivo.value === "true"
  };

  if (!payload.nome || !payload.username || !payload.perfil) {
    usuarioMensagem.textContent = "Preencha os campos obrigatórios.";
    return;
  }

  if (!modoEdicao && !usuarioSenha.value.trim()) {
    usuarioMensagem.textContent = "A senha é obrigatória para criar usuário.";
    return;
  }

  if (!modoEdicao || usuarioSenha.value.trim()) {
    payload.senha = usuarioSenha.value.trim();
  }

  try {
    const url = modoEdicao
      ? `${API_BASE_URL}/usuarios/${usuarioEditandoId}`
      : `${API_BASE_URL}/usuarios`;

    const method = modoEdicao ? "PUT" : "POST";

    const resposta = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      usuarioMensagem.textContent = dados.erro || "Erro ao salvar usuário.";
      return;
    }

    usuarioForm.reset();
    resetarModoEdicao();
    fecharModalUsuario();
    await carregarUsuarios();
  } catch (error) {
    usuarioMensagem.textContent = "Erro ao conectar com o servidor.";
  }
});

function prepararModalNovoUsuario() {
  usuarioForm.reset();
  resetarModoEdicao();
  modalUsuarioTitulo.textContent = "Novo usuário";
  salvarUsuarioBtn.textContent = "Salvar usuário";
  usuarioMensagem.textContent = "";
  usuarioAtivo.value = "true";
}

function prepararModalEditarUsuario(usuario) {
  modoEdicao = true;
  usuarioEditandoId = usuario.id;

  modalUsuarioTitulo.textContent = "Editar usuário";
  salvarUsuarioBtn.textContent = "Salvar alterações";
  usuarioMensagem.textContent = "";

  usuarioNome.value = usuario.nome || "";
  usuarioUsername.value = usuario.username || "";
  usuarioPerfil.value = usuario.perfil || "";
  usuarioAtivo.value = String(usuario.ativo);
  usuarioSenha.value = "";

  modalUsuarioOverlay.classList.remove("hidden");
}

function resetarModoEdicao() {
  modoEdicao = false;
  usuarioEditandoId = null;
}

function fecharModalUsuario() {
  modalUsuarioOverlay.classList.add("hidden");
  usuarioMensagem.textContent = "";
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function criarBadgePerfil(perfil) {
  const classe = perfil === "admin" ? "badge-admin" : "badge-comum";
  return `<span class="badge ${classe}">${perfil}</span>`;
}

function criarBadgeStatus(ativo) {
  return ativo
    ? `<span class="badge badge-ativo">Ativo</span>`
    : `<span class="badge badge-inativo">Inativo</span>`;
}

function renderizarTabela(usuarios) {
  if (!usuarios.length) {
    tabelaUsuarios.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Nenhum usuário encontrado.</td>
      </tr>
    `;
    return;
  }

  tabelaUsuarios.innerHTML = usuarios
    .map(
      (usuario) => `
        <tr>
          <td>${usuario.nome || "-"}</td>
          <td>${usuario.username || "-"}</td>
          <td>${criarBadgePerfil(usuario.perfil)}</td>
          <td>${criarBadgeStatus(usuario.ativo)}</td>
          <td>${formatarData(usuario.criado_em)}</td>
          <td>
            <button class="btn" data-acao="editar" data-id="${usuario.id}">
              Editar
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

tabelaUsuarios.addEventListener("click", (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;

  if (acao === "editar") {
    const usuario = usuariosCache.find((u) => String(u.id) === String(id));
    if (usuario) prepararModalEditarUsuario(usuario);
  }
});

async function carregarUsuarios() {
  tabelaUsuarios.innerHTML = `
    <tr>
      <td colspan="6">Carregando...</td>
    </tr>
  `;

  try {
    const resposta = await fetch(`${API_BASE_URL}/usuarios`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      tabelaUsuarios.innerHTML = `
        <tr>
          <td colspan="6">${dados.erro || "Erro ao carregar usuários."}</td>
        </tr>
      `;
      return;
    }

    usuariosCache = dados;
    renderizarTabela(dados);
  } catch (error) {
    tabelaUsuarios.innerHTML = `
      <tr>
        <td colspan="6">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}

carregarUsuarios();
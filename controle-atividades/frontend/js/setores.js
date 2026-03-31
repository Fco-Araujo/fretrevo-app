import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
const ehAdmin = usuario?.perfil === "admin";

if (!token) {
  window.location.href = "./index.html";
}

if (!ehAdmin) {
  alert("Acesso permitido apenas para administradores.");
  window.location.href = "./dashboard.html";
}

const boasVindas = document.getElementById("boasVindas");
const menuUsuariosLink = document.getElementById("menuUsuariosLink");
const menuSetoresLink = document.getElementById("menuSetoresLink");
const logoutBtn = document.getElementById("logoutBtn");

const setorForm = document.getElementById("setorForm");
const nomeSetorInput = document.getElementById("nomeSetor");
const ativoSetorInput = document.getElementById("ativoSetor");
const setorMensagem = document.getElementById("setorMensagem");
const salvarSetorBtn = document.getElementById("salvarSetorBtn");
const cancelarEdicaoSetorBtn = document.getElementById("cancelarEdicaoSetorBtn");
const tabelaSetores = document.getElementById("tabelaSetores");

let setoresCache = [];
let modoEdicao = false;
let setorEditandoId = null;

boasVindas.textContent = usuario?.nome || "Usuário";

if (menuUsuariosLink) menuUsuariosLink.classList.remove("hidden");
if (menuSetoresLink) menuSetoresLink.classList.remove("hidden");

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

setorForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagem();

  const nome = nomeSetorInput.value.trim();
  const ativo = ativoSetorInput.value === "true";

  if (!nome) {
    mostrarMensagem("Informe o nome do setor.", "erro");
    return;
  }

  const url = modoEdicao
    ? `${API_BASE_URL}/setores/${setorEditandoId}`
    : `${API_BASE_URL}/setores`;

  const method = modoEdicao ? "PUT" : "POST";

  try {
    const resposta = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ nome, ativo })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      mostrarMensagem(dados.erro || "Erro ao salvar setor.", "erro");
      return;
    }

    mostrarMensagem(
      modoEdicao ? "Setor atualizado com sucesso." : "Setor cadastrado com sucesso.",
      "sucesso"
    );

    resetarFormulario();
    await carregarSetores();
  } catch (error) {
    mostrarMensagem("Erro ao conectar com o servidor.", "erro");
  }
});

cancelarEdicaoSetorBtn?.addEventListener("click", () => {
  resetarFormulario();
  limparMensagem();
});

tabelaSetores?.addEventListener("click", (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;

  if (acao === "editar") {
    const setor = setoresCache.find((item) => String(item.id) === String(id));
    if (!setor) return;

    modoEdicao = true;
    setorEditandoId = setor.id;

    nomeSetorInput.value = setor.nome || "";
    ativoSetorInput.value = String(setor.ativo);

    salvarSetorBtn.textContent = "Salvar alterações";
    cancelarEdicaoSetorBtn.classList.remove("hidden");
    limparMensagem();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

function mostrarMensagem(texto, tipo = "") {
  if (!setorMensagem) return;
  setorMensagem.textContent = texto;
  setorMensagem.className = tipo ? `form-message ${tipo}` : "form-message";
}

function limparMensagem() {
  if (!setorMensagem) return;
  setorMensagem.textContent = "";
  setorMensagem.className = "form-message";
}

function resetarFormulario() {
  modoEdicao = false;
  setorEditandoId = null;
  setorForm.reset();
  ativoSetorInput.value = "true";
  salvarSetorBtn.textContent = "Salvar setor";
  cancelarEdicaoSetorBtn.classList.add("hidden");
}

function formatarData(data) {
  if (!data) return "-";

  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return "-";

  return dt.toLocaleDateString("pt-BR");
}

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderizarSetores(setores) {
  if (!setores.length) {
    tabelaSetores.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Nenhum setor cadastrado.</td>
      </tr>
    `;
    return;
  }

  tabelaSetores.innerHTML = setores
    .map((setor) => {
      const statusClass = setor.ativo
        ? "status-chip status-concluida"
        : "status-chip status-atrasado";

      const statusTexto = setor.ativo ? "ativo" : "inativo";

      return `
        <tr>
          <td>${escaparHtml(setor.nome)}</td>
          <td>
            <span class="${statusClass}">
              ${statusTexto}
            </span>
          </td>
          <td>${formatarData(setor.criado_em)}</td>
          <td>
            <div class="acoes-botoes">
              <button
                type="button"
                class="btn-acao"
                data-acao="editar"
                data-id="${setor.id}"
              >
                Editar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function carregarSetores() {
  tabelaSetores.innerHTML = `
    <tr>
      <td colspan="4" class="empty-state">Carregando setores.</td>
    </tr>
  `;

  try {
    const resposta = await fetch(`${API_BASE_URL}/setores`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      tabelaSetores.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            ${escaparHtml(dados.erro || "Erro ao carregar setores.")}
          </td>
        </tr>
      `;
      return;
    }

    setoresCache = Array.isArray(dados) ? dados : [];
    renderizarSetores(setoresCache);
  } catch (error) {
    tabelaSetores.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}

carregarSetores();
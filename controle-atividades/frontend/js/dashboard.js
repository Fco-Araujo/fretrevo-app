import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token) {
  window.location.href = "./index.html";
}

const boasVindas = document.getElementById("boasVindas");
const tabelaAtividades = document.getElementById("tabelaAtividades");
const cardTotal = document.getElementById("cardTotal");
const cardPendentes = document.getElementById("cardPendentes");
const cardAndamento = document.getElementById("cardAndamento");
const cardConcluidas = document.getElementById("cardConcluidas");
const logoutBtn = document.getElementById("logoutBtn");
const recarregarBtn = document.getElementById("recarregarBtn");

const abrirModalBtn = document.getElementById("abrirModalBtn");
const fecharModalBtn = document.getElementById("fecharModalBtn");
const cancelarModalBtn = document.getElementById("cancelarModalBtn");
const modalOverlay = document.getElementById("modalOverlay");

const atividadeForm = document.getElementById("atividadeForm");
const atividadeMensagem = document.getElementById("atividadeMensagem");

const tituloInput = document.getElementById("titulo");
const descricaoInput = document.getElementById("descricao");
const prioridadeInput = document.getElementById("prioridade");
const statusInput = document.getElementById("status");
const prazoInput = document.getElementById("prazo");

const modalTitulo = document.querySelector(".modal-header h3");
const botaoSubmitModal = atividadeForm.querySelector('button[type="submit"]');

let atividadesCache = [];
let modoEdicao = false;
let atividadeEditandoId = null;

boasVindas.textContent = `Bem-vindo, ${usuario?.nome || "usuário"}`;

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

abrirModalBtn.addEventListener("click", () => {
  prepararModalNovaAtividade();
  modalOverlay.classList.remove("hidden");
});

fecharModalBtn.addEventListener("click", fecharModal);
cancelarModalBtn.addEventListener("click", fecharModal);

modalOverlay.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    fecharModal();
  }
});

recarregarBtn.addEventListener("click", carregarAtividades);

atividadeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  atividadeMensagem.textContent = "";

  const payload = {
    titulo: tituloInput.value.trim(),
    descricao: descricaoInput.value.trim(),
    prioridade: prioridadeInput.value,
    status: statusInput.value,
    prazo: prazoInput.value || null
  };

  if (!payload.titulo) {
    atividadeMensagem.textContent = "O título é obrigatório.";
    return;
  }

  try {
    const url = modoEdicao
      ? `${API_BASE_URL}/atividades/${atividadeEditandoId}`
      : `${API_BASE_URL}/atividades`;

    const method = modoEdicao ? "PUT" : "POST";

    const resposta = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      atividadeMensagem.textContent = dados.erro || "Erro ao salvar atividade.";
      return;
    }

    atividadeForm.reset();
    resetarModoEdicao();
    fecharModal();
    carregarAtividades();
  } catch (error) {
    atividadeMensagem.textContent = "Erro ao conectar com o servidor.";
  }
});

function prepararModalNovaAtividade() {
  resetarModoEdicao();
  atividadeForm.reset();
  atividadeMensagem.textContent = "";
  modalTitulo.textContent = "Nova atividade";
  botaoSubmitModal.textContent = "Salvar atividade";
}

function prepararModalEdicao(atividade) {
  modoEdicao = true;
  atividadeEditandoId = atividade.id;

  modalTitulo.textContent = "Editar atividade";
  botaoSubmitModal.textContent = "Salvar alterações";
  atividadeMensagem.textContent = "";

  tituloInput.value = atividade.titulo || "";
  descricaoInput.value = atividade.descricao || "";
  prioridadeInput.value = atividade.prioridade || "";
  statusInput.value = atividade.status || "";
  prazoInput.value = formatarDataParaInput(atividade.prazo);

  modalOverlay.classList.remove("hidden");
}

function resetarModoEdicao() {
  modoEdicao = false;
  atividadeEditandoId = null;
  modalTitulo.textContent = "Nova atividade";
  botaoSubmitModal.textContent = "Salvar atividade";
}

function fecharModal() {
  modalOverlay.classList.add("hidden");
  atividadeMensagem.textContent = "";
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataParaInput(data) {
  if (!data) return "";

  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}/.test(data)) {
    return data.slice(0, 10);
  }

  const dt = new Date(data);

  if (Number.isNaN(dt.getTime())) return "";

  const ano = dt.getFullYear();
  const mes = String(dt.getMonth() + 1).padStart(2, "0");
  const dia = String(dt.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function criarBadge(texto, tipo) {
  const classe = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  return `<span class="badge badge-${classe}">${tipo || texto}</span>`;
}

function atualizarCards(atividades) {
  const total = atividades.length;
  const pendentes = atividades.filter(
    (item) => (item.status || "").toLowerCase() === "pendente"
  ).length;
  const andamento = atividades.filter(
    (item) => (item.status || "").toLowerCase() === "em andamento"
  ).length;
  const concluidas = atividades.filter((item) => {
    const status = (item.status || "").toLowerCase();
    return status === "concluída" || status === "concluida";
  }).length;

  cardTotal.textContent = total;
  cardPendentes.textContent = pendentes;
  cardAndamento.textContent = andamento;
  cardConcluidas.textContent = concluidas;
}

function renderizarTabela(atividades) {
  if (!atividades.length) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Nenhuma atividade cadastrada.</td>
      </tr>
    `;
    return;
  }

  tabelaAtividades.innerHTML = atividades
    .map((atividade) => {
      const statusNormalizado = (atividade.status || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const jaConcluida = statusNormalizado === "concluida";

      return `
        <tr>
          <td>${atividade.titulo || "-"}</td>
          <td>${atividade.descricao || "-"}</td>
          <td>${atividade.prioridade ? criarBadge(atividade.prioridade) : "-"}</td>
          <td>${atividade.status ? criarBadge(atividade.status) : "-"}</td>
          <td>${formatarData(atividade.data_criacao)}</td>
          <td>${formatarData(atividade.prazo)}</td>
          <td>
            <div class="acoes-tabela">
              <button
                class="btn btn-outline btn-tabela"
                data-acao="editar"
                data-id="${atividade.id}"
                title="Editar atividade"
              >
                Editar
              </button>

              <button
                class="btn btn-outline btn-tabela btn-icon btn-concluir ${jaConcluida ? "btn-concluida" : ""}"
                data-acao="concluir"
                data-id="${atividade.id}"
                title="${jaConcluida ? "Atividade já concluída" : "Concluir atividade"}"
                ${jaConcluida ? "disabled" : ""}
              >
                ✔
              </button>

              <button
                class="btn btn-outline btn-tabela btn-excluir"
                data-acao="excluir"
                data-id="${atividade.id}"
                title="Excluir atividade"
              >
                Excluir
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

tabelaAtividades.addEventListener("click", async (event) => {
  const botao = event.target.closest("button[data-acao]");

  if (!botao) return;

  const { acao, id } = botao.dataset;

  if (acao === "editar") {
    const atividade = atividadesCache.find((item) => String(item.id) === String(id));

    if (!atividade) {
      alert("Atividade não encontrada.");
      return;
    }

    prepararModalEdicao(atividade);
    return;
  }

  if (acao === "concluir") {
    const atividade = atividadesCache.find((item) => String(item.id) === String(id));

    if (!atividade) {
      alert("Atividade não encontrada.");
      return;
    }

    const confirmar = confirm("Deseja marcar esta atividade como concluída?");

    if (!confirmar) return;

    try {
      const payload = {
        titulo: atividade.titulo || "",
        descricao: atividade.descricao || "",
        prioridade: atividade.prioridade || null,
        status: "concluída",
        prazo: atividade.prazo || null,
        tipo: atividade.tipo || null,
        origem: atividade.origem || null,
        observacoes: atividade.observacoes || null
      };

      const resposta = await fetch(`${API_BASE_URL}/atividades/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        alert(dados.erro || "Erro ao concluir atividade.");
        return;
      }

      carregarAtividades();
      return;
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
      return;
    }
  }

  if (acao === "excluir") {
    const confirmar = confirm("Deseja excluir esta atividade?");

    if (!confirmar) return;

    try {
      const resposta = await fetch(`${API_BASE_URL}/atividades/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        alert(dados.erro || "Erro ao excluir atividade.");
        return;
      }

      carregarAtividades();
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  }
});
async function carregarAtividades() {
  tabelaAtividades.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">Carregando atividades.</td>
    </tr>
  `;

  try {
    const resposta = await fetch(`${API_BASE_URL}/atividades`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      if (resposta.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "./index.html";
        return;
      }

      tabelaAtividades.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">${dados.erro || "Erro ao carregar atividades."}</td>
        </tr>
      `;
      return;
    }

    atividadesCache = dados;
    atualizarCards(dados);
    renderizarTabela(dados);
  } catch (error) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}
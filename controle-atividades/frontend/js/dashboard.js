import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token) {
  window.location.href = "./index.html";
}

const menuUsuariosLink = document.getElementById("menuUsuariosLink");
const boasVindas = document.getElementById("boasVindas");
const tabelaAtividades = document.getElementById("tabelaAtividades");

const cardTotal = document.getElementById("cardTotal");
const cardPendentes = document.getElementById("cardPendentes");
const cardAndamento = document.getElementById("cardAndamento");
const cardAtrasadas = document.getElementById("cardAtrasadas");
const cardConcluidas = document.getElementById("cardConcluidas");

const logoutBtn = document.getElementById("logoutBtn");
const recarregarBtn = document.getElementById("recarregarBtn");
const limparFiltrosBtn = document.getElementById("limparFiltrosBtn");

const filtroBusca = document.getElementById("filtroBusca");
const filtroPrioridade = document.getElementById("filtroPrioridade");
const filtroStatus = document.getElementById("filtroStatus");
const filtroPrazo = document.getElementById("filtroPrazo");

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

boasVindas.textContent = usuario?.nome || "Usuário";

if (usuario?.perfil === "admin" && menuUsuariosLink) {
  menuUsuariosLink.classList.remove("hidden");
}

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
limparFiltrosBtn.addEventListener("click", limparFiltros);

[filtroBusca, filtroPrioridade, filtroStatus, filtroPrazo].forEach((elemento) => {
  elemento.addEventListener("input", aplicarFiltros);
  elemento.addEventListener("change", aplicarFiltros);
});

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
        Authorization: `Bearer ${token}`
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
  statusInput.value = normalizarStatusOriginal(atividade.status);
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

function normalizarTexto(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function obterHojeSemHora() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function obterDataSemHora(data) {
  if (!data) return null;

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) return null;

  dataConvertida.setHours(0, 0, 0, 0);
  return dataConvertida;
}

function statusEfetivo(atividade) {
  const statusOriginal = normalizarTexto(atividade.status);
  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();

  const concluida =
    statusOriginal === "concluida" ||
    statusOriginal === "concluída";

  if (!concluida && prazo && prazo < hoje) {
    if (statusOriginal === "pendente" || statusOriginal === "em andamento") {
      return "atrasado";
    }
  }

  if (statusOriginal === "concluida" || statusOriginal === "concluída") {
    return "concluída";
  }

  if (statusOriginal === "em andamento") {
    return "em andamento";
  }

  if (statusOriginal === "pendente") {
    return "pendente";
  }

  return atividade.status || "-";
}

function normalizarStatusOriginal(status) {
  const texto = normalizarTexto(status);

  if (texto === "concluida" || texto === "concluída") return "concluída";
  if (texto === "em andamento") return "em andamento";
  if (texto === "pendente") return "pendente";

  return "";
}

function criarBadge(texto, rotulo = texto) {
  const classe = normalizarTexto(texto).replace(/\s+/g, "-");
  return `<span class="badge badge-${classe}">${rotulo}</span>`;
}

function atualizarCards(atividades) {
  const total = atividades.length;

  const pendentes = atividades.filter(
    (item) => statusEfetivo(item) === "pendente"
  ).length;

  const andamento = atividades.filter(
    (item) => statusEfetivo(item) === "em andamento"
  ).length;

  const atrasadas = atividades.filter(
    (item) => statusEfetivo(item) === "atrasado"
  ).length;

  const concluidas = atividades.filter(
    (item) => statusEfetivo(item) === "concluída"
  ).length;

  cardTotal.textContent = total;
  cardPendentes.textContent = pendentes;
  cardAndamento.textContent = andamento;
  cardAtrasadas.textContent = atrasadas;
  cardConcluidas.textContent = concluidas;
}

function renderizarTabela(atividades) {
  if (!atividades.length) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">Nenhuma atividade encontrada.</td>
      </tr>
    `;
    return;
  }

  tabelaAtividades.innerHTML = atividades
    .map((atividade) => {
      const statusAtual = statusEfetivo(atividade);
      const jaConcluida = normalizarTexto(statusAtual) === "concluida";

      return `
        <tr>
          <td class="col-atividade">${atividade.titulo || "-"}</td>
          <td class="col-responsavel">${atividade.criador?.nome || "-"}</td>
          <td class="col-descricao" title="${atividade.descricao || "-"}">${atividade.descricao || "-"}</td>
          <td>${atividade.prioridade ? criarBadge(atividade.prioridade) : "-"}</td>
          <td>${atividade.status ? criarBadge(statusAtual) : "-"}</td>
          <td class="col-data">${formatarData(atividade.data_criacao)}</td>
          <td class="col-data">${formatarData(atividade.prazo)}</td>
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

function aplicarFiltros() {
  const termoBusca = normalizarTexto(filtroBusca.value);
  const prioridadeSelecionada = normalizarTexto(filtroPrioridade.value);
  const statusSelecionado = normalizarTexto(filtroStatus.value);
  const prazoSelecionado = normalizarTexto(filtroPrazo.value);

  const hoje = obterHojeSemHora();

  const atividadesFiltradas = atividadesCache.filter((atividade) => {
    const titulo = normalizarTexto(atividade.titulo);
    const descricao = normalizarTexto(atividade.descricao);
    const prioridade = normalizarTexto(atividade.prioridade);
    const status = normalizarTexto(statusEfetivo(atividade));
    const prazo = obterDataSemHora(atividade.prazo);

    const atendeBusca =
      !termoBusca ||
      titulo.includes(termoBusca) ||
      descricao.includes(termoBusca);

    const atendePrioridade =
      !prioridadeSelecionada || prioridade === prioridadeSelecionada;

    const atendeStatus =
      !statusSelecionado || status === statusSelecionado;

    let atendePrazo = true;

    if (prazoSelecionado === "sem-prazo") {
      atendePrazo = !prazo;
    } else if (prazoSelecionado === "hoje") {
      atendePrazo = !!prazo && prazo.getTime() === hoje.getTime();
    } else if (prazoSelecionado === "vencidas") {
      atendePrazo = !!prazo && prazo < hoje;
    } else if (prazoSelecionado === "proximas") {
      atendePrazo = !!prazo && prazo >= hoje;
    }

    return atendeBusca && atendePrioridade && atendeStatus && atendePrazo;
  });

  atualizarCards(atividadesFiltradas);
  renderizarTabela(atividadesFiltradas);
}

function limparFiltros() {
  filtroBusca.value = "";
  filtroPrioridade.value = "";
  filtroStatus.value = "";
  filtroPrazo.value = "";
  aplicarFiltros();
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
          Authorization: `Bearer ${token}`
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
          Authorization: `Bearer ${token}`
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
      <td colspan="8" class="empty-state">Carregando atividades.</td>
    </tr>
  `;

  try {
    const resposta = await fetch(`${API_BASE_URL}/atividades`, {
      headers: {
        Authorization: `Bearer ${token}`
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
          <td colspan="8" class="empty-state">${dados.erro || "Erro ao carregar atividades."}</td>
        </tr>
      `;
      return;
    }

    atividadesCache = Array.isArray(dados) ? dados : [];
    aplicarFiltros();
  } catch (error) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">Erro ao conectar com o servidor.</td>
      </tr>
    `;
  }
}

carregarAtividades();
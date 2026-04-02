import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
const ehAdmin = usuario?.perfil === "admin";

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
const cardQualidade = document.getElementById("cardQualidade");
const cardDiversos = document.getElementById("cardDiversos");
const cardReuniao = document.getElementById("cardReuniao");

const logoutBtn = document.getElementById("logoutBtn");
const recarregarBtn = document.getElementById("recarregarBtn");
const limparFiltrosBtn = document.getElementById("limparFiltrosBtn");

const filtroBusca = document.getElementById("filtroBusca");

/*
  Compatibilidade:
  - HTML antigo: selects tradicionais
  - HTML novo: dropdowns com checkboxes
*/
const filtroTipoSelect = document.getElementById("filtroTipo");
const filtroPrioridadeSelect = document.getElementById("filtroPrioridade");
const filtroStatusSelect = document.getElementById("filtroStatus");
const filtroPrazoSelect = document.getElementById("filtroPrazo");
const filtroSetorSelect = document.getElementById("filtroSetor");

const abrirModalBtn = document.getElementById("abrirModalBtn");
const fecharModalBtn = document.getElementById("fecharModalBtn");
const cancelarModalBtn = document.getElementById("cancelarModalBtn");
const modalOverlay = document.getElementById("modalOverlay");

const atividadeForm = document.getElementById("atividadeForm");
const atividadeMensagem = document.getElementById("atividadeMensagem");

const tituloInput = document.getElementById("titulo");
const descricaoInput = document.getElementById("descricao");
const observacoesInput = document.getElementById("observacoes");
const tipoInput = document.getElementById("tipo");
const prioridadeInput = document.getElementById("prioridade");
const statusInput = document.getElementById("status");
const prazoInput = document.getElementById("prazo");
const responsavelInput = document.getElementById("responsavelId");

const setorSelect = document.getElementById("setorSelect");
const adicionarSetorBtn = document.getElementById("adicionarSetorBtn");
const setoresSelecionadosEl = document.getElementById("setoresSelecionados");

const dataReuniaoInput = document.getElementById("dataReuniao");

const modalTitulo = document.querySelector(".modal-header h3");
const botaoSubmitModal = atividadeForm?.querySelector('button[type="submit"]');

let atividadesCache = [];
let setoresCache = [];
let usuariosCache = [];
let setoresSelecionados = [];

let modoEdicao = false;
let atividadeEditandoId = null;

const filtrosSelecionados = {
  tipo: [],
  prioridade: [],
  status: [],
  prazo: [],
  setor: []
};

const dropdownFilters = {
  tipo: criarControleDropdown("tipo"),
  prioridade: criarControleDropdown("prioridade"),
  status: criarControleDropdown("status"),
  prazo: criarControleDropdown("prazo"),
  setor: criarControleDropdown("setor")
};

if (boasVindas) {
  boasVindas.textContent = usuario?.nome || "Usuário";
}

if (ehAdmin && menuUsuariosLink) {
  menuUsuariosLink.classList.remove("hidden");
}

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

abrirModalBtn?.addEventListener("click", () => {
  prepararModalNovaAtividade();
  modalOverlay?.classList.remove("hidden");
});

fecharModalBtn?.addEventListener("click", fecharModal);
cancelarModalBtn?.addEventListener("click", fecharModal);

modalOverlay?.addEventListener("click", (event) => {
  if (event.target === modalOverlay) {
    fecharModal();
  }
});

document.addEventListener("click", (event) => {
  const clicouDentroDeDropdown = event.target.closest("[data-dropdown-root]");
  if (!clicouDentroDeDropdown) {
    fecharTodosDropdowns();
  }
});

recarregarBtn?.addEventListener("click", async () => {
  await carregarUsuarios();
  await carregarSetores();
  await carregarAtividades();
});

limparFiltrosBtn?.addEventListener("click", limparFiltros);

filtroBusca?.addEventListener("input", aplicarFiltros);

[
  filtroTipoSelect,
  filtroPrioridadeSelect,
  filtroStatusSelect,
  filtroPrazoSelect,
  filtroSetorSelect
].forEach((elemento) => {
  if (!elemento) return;
  elemento.addEventListener("change", aplicarFiltros);
});

adicionarSetorBtn?.addEventListener("click", () => {
  const nomeSetor = setorSelect?.value || "";
  if (!nomeSetor) return;

  if (!setoresSelecionados.includes(nomeSetor)) {
    setoresSelecionados.push(nomeSetor);
    renderizarSetoresSelecionados();
  }

  if (setorSelect) {
    setorSelect.value = "";
  }
});

atividadeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagemFormulario();

  const responsavelSelecionado = responsavelInput?.value || usuario?.id || null;

  const payload = {
    titulo: tituloInput?.value.trim() || "",
    descricao: descricaoInput?.value.trim() || "",
    observacoes: observacoesInput?.value.trim() || null,
    tipo: tipoInput?.value || null,
    prioridade: prioridadeInput?.value || null,
    status: statusInput?.value || null,
    prazo: prazoInput?.value || null,
    setor: setoresSelecionados.length ? setoresSelecionados.join(", ") : null,
    data_reuniao: dataReuniaoInput?.value || null,
    responsavel_id: responsavelSelecionado
  };

  if (!payload.titulo) {
    mostrarMensagemFormulario("O título é obrigatório.", "erro");
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
      mostrarMensagemFormulario(
        dados.erro || "Erro ao salvar atividade.",
        "erro"
      );
      return;
    }

    atividadeForm.reset();
    resetarModoEdicao();
    fecharModal();
    await carregarAtividades();
  } catch (error) {
    mostrarMensagemFormulario("Erro ao conectar com o servidor.", "erro");
  }
});

function criarControleDropdown(chave) {
  const root =
    document.querySelector(`[data-dropdown-root="${chave}"]`) ||
    document.querySelector(`.filtro-dropdown[data-filter="${chave}"]`) ||
    document.querySelector(`[data-filter-key="${chave}"]`);

  if (!root) {
    return null;
  }

  const trigger =
    root.querySelector("[data-dropdown-trigger]") ||
    root.querySelector(".filtro-dropdown-btn") ||
    root.querySelector("button");

  const menu =
    root.querySelector("[data-dropdown-menu]") ||
    root.querySelector(".filtro-dropdown-menu");

  const summary =
    root.querySelector("[data-dropdown-summary]") ||
    root.querySelector(".filtro-dropdown-summary");

  const optionsWrap =
    root.querySelector("[data-dropdown-options]") ||
    root.querySelector(".filtro-dropdown-options");

  if (!trigger || !menu || !optionsWrap) {
    return null;
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const aberto = root.classList.contains("open");
    fecharTodosDropdowns();
    if (!aberto) {
      root.classList.add("open");
    }
  });

  optionsWrap.addEventListener("change", (event) => {
    const input = event.target.closest('input[type="checkbox"]');
    if (!input) return;

    const selecionados = Array.from(
      optionsWrap.querySelectorAll('input[type="checkbox"]:checked')
    ).map((item) => item.value);

    filtrosSelecionados[chave] = selecionados;
    atualizarResumoDropdown(chave);
    aplicarFiltros();
  });

  return {
    root,
    trigger,
    menu,
    summary,
    optionsWrap
  };
}

function fecharTodosDropdowns() {
  Object.values(dropdownFilters).forEach((controle) => {
    if (controle?.root) {
      controle.root.classList.remove("open");
    }
  });
}

function atualizarResumoDropdown(chave) {
  const controle = dropdownFilters[chave];
  if (!controle?.summary) return;

  const selecionados = filtrosSelecionados[chave] || [];
  const labelPadraoMap = {
    tipo: "Todos",
    prioridade: "Todas",
    status: "Todos",
    prazo: "Todos",
    setor: "Todos"
  };

  if (!selecionados.length) {
    controle.summary.textContent = labelPadraoMap[chave] || "Todos";
    return;
  }

  if (selecionados.length === 1) {
    controle.summary.textContent = selecionados[0];
    return;
  }

  controle.summary.textContent = `${selecionados.length} selecionados`;
}

function preencherDropdown(chave, opcoes) {
  const controle = dropdownFilters[chave];
  if (!controle?.optionsWrap) return;

  const selecionadosAtuais = filtrosSelecionados[chave] || [];
  const selecionadosValidos = selecionadosAtuais.filter((valor) =>
    opcoes.includes(valor)
  );

  filtrosSelecionados[chave] = selecionadosValidos;

  controle.optionsWrap.innerHTML = opcoes
    .map((valor) => {
      const checked = selecionadosValidos.includes(valor) ? "checked" : "";
      return `
        <label class="filtro-opcao-item">
          <input type="checkbox" value="${escaparHtml(valor)}" ${checked} />
          <span>${escaparHtml(valor)}</span>
        </label>
      `;
    })
    .join("");

  atualizarResumoDropdown(chave);
}

function mostrarMensagemFormulario(texto, tipo = "") {
  if (!atividadeMensagem) return;
  atividadeMensagem.textContent = texto;
  atividadeMensagem.className = tipo
    ? `form-message ${tipo}`
    : "form-message";
}

function limparMensagemFormulario() {
  if (!atividadeMensagem) return;
  atividadeMensagem.textContent = "";
  atividadeMensagem.className = "form-message";
}

function prepararModalNovaAtividade() {
  resetarModoEdicao();
  atividadeForm?.reset();
  limparMensagemFormulario();

  if (modalTitulo) modalTitulo.textContent = "Nova atividade";
  if (botaoSubmitModal) botaoSubmitModal.textContent = "Salvar atividade";

  setoresSelecionados = [];
  renderizarSetoresSelecionados();

  if (responsavelInput) {
    responsavelInput.disabled = false;
    responsavelInput.value = usuario?.id || "";
  }

  if (tituloInput) tituloInput.disabled = false;
  if (descricaoInput) descricaoInput.disabled = false;
  if (observacoesInput) observacoesInput.disabled = false;
  if (tipoInput) tipoInput.disabled = false;
  if (prazoInput) prazoInput.disabled = false;
  if (prioridadeInput) prioridadeInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (setorSelect) setorSelect.disabled = false;
  if (adicionarSetorBtn) adicionarSetorBtn.disabled = false;
  if (dataReuniaoInput) dataReuniaoInput.disabled = false;
}

function prepararModalEdicao(atividade) {
  modoEdicao = true;
  atividadeEditandoId = atividade.id;

  if (modalTitulo) modalTitulo.textContent = "Editar atividade";
  if (botaoSubmitModal) botaoSubmitModal.textContent = "Salvar alterações";

  limparMensagemFormulario();

  if (tituloInput) tituloInput.value = atividade.titulo || "";
  if (descricaoInput) descricaoInput.value = atividade.descricao || "";
  if (observacoesInput) observacoesInput.value = atividade.observacoes || "";
  if (tipoInput) tipoInput.value = atividade.tipo || "";
  if (prioridadeInput) prioridadeInput.value = atividade.prioridade || "";
  if (statusInput) statusInput.value = normalizarStatusOriginal(atividade.status);
  if (prazoInput) prazoInput.value = formatarDataParaInput(atividade.prazo);

  if (dataReuniaoInput) {
    dataReuniaoInput.value = formatarDataParaInput(atividade.data_reuniao);
  }

  if (responsavelInput) {
    responsavelInput.disabled = false;
    responsavelInput.value =
      atividade.responsavel_id ||
      atividade?.responsavel?.id ||
      atividade.criado_por ||
      usuario?.id ||
      "";
  }

  setoresSelecionados = quebrarSetores(atividade.setor);
  renderizarSetoresSelecionados();

  if (ehAdmin) {
    if (tituloInput) tituloInput.disabled = false;
    if (descricaoInput) descricaoInput.disabled = false;
    if (prazoInput) prazoInput.disabled = false;
  } else {
    if (tituloInput) tituloInput.disabled = true;
    if (descricaoInput) descricaoInput.disabled = true;
    if (prazoInput) prazoInput.disabled = true;
  }

  if (observacoesInput) observacoesInput.disabled = false;
  if (tipoInput) tipoInput.disabled = false;
  if (prioridadeInput) prioridadeInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (setorSelect) setorSelect.disabled = false;
  if (adicionarSetorBtn) adicionarSetorBtn.disabled = false;
  if (dataReuniaoInput) dataReuniaoInput.disabled = false;

  modalOverlay?.classList.remove("hidden");
}

function resetarModoEdicao() {
  modoEdicao = false;
  atividadeEditandoId = null;
  setoresSelecionados = [];
  renderizarSetoresSelecionados();

  if (modalTitulo) modalTitulo.textContent = "Nova atividade";
  if (botaoSubmitModal) botaoSubmitModal.textContent = "Salvar atividade";
}

function fecharModal() {
  modalOverlay?.classList.add("hidden");
  limparMensagemFormulario();
}

function quebrarSetores(texto) {
  if (!texto) return [];
  return String(texto)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function removerSetorSelecionado(nomeSetor) {
  setoresSelecionados = setoresSelecionados.filter((setor) => setor !== nomeSetor);
  renderizarSetoresSelecionados();
}

function renderizarSetoresSelecionados() {
  if (!setoresSelecionadosEl) return;

  if (!setoresSelecionados.length) {
    setoresSelecionadosEl.innerHTML = "";
    return;
  }

  setoresSelecionadosEl.innerHTML = setoresSelecionados
    .map(
      (setor) => `
        <span class="setor-tag">
          ${escaparHtml(setor)}
          <button
            type="button"
            class="remover-setor-btn"
            data-setor="${escaparHtml(setor)}"
          >
            ×
          </button>
        </span>
      `
    )
    .join("");

  setoresSelecionadosEl.querySelectorAll(".remover-setor-btn").forEach((botao) => {
    botao.addEventListener("click", () => {
      removerSetorSelecionado(botao.dataset.setor);
    });
  });
}

function formatarData(data) {
  if (!data) return "-";

  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const dt = new Date(data);

  if (Number.isNaN(dt.getTime())) return "-";

  const dia = String(dt.getDate()).padStart(2, "0");
  const mes = String(dt.getMonth() + 1).padStart(2, "0");
  const ano = dt.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

function formatarDataParaInput(data) {
  if (!data) return "";

  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function obterDataSemHora(data) {
  if (!data) return null;

  if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    const [ano, mes, dia] = data.split("-").map(Number);
    return new Date(ano, mes - 1, dia);
  }

  const dt = new Date(data);

  if (Number.isNaN(dt.getTime())) return null;

  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function obterHojeSemHora() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

function diferencaEmDias(dataInicial, dataFinal) {
  if (!dataInicial || !dataFinal) return null;
  const msPorDia = 1000 * 60 * 60 * 24;
  return Math.round((dataFinal.getTime() - dataInicial.getTime()) / msPorDia);
}

function statusEfetivo(atividade) {
  const statusOriginal = normalizarStatusOriginal(atividade.status);

  if (normalizarTexto(statusOriginal) === "concluida") {
    return "Concluída";
  }

  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();

  if (prazo && prazo < hoje) {
    return "Atrasado";
  }

  if (normalizarTexto(statusOriginal) === "em andamento") {
    return "Em andamento";
  }

  return "Pendente";
}

function normalizarStatusOriginal(status) {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado === "concluida") return "concluída";
  if (statusNormalizado === "em andamento") return "em andamento";
  if (statusNormalizado === "pendente") return "pendente";
  if (statusNormalizado === "atrasado") return "atrasado";

  return status || "pendente";
}

function obterClasseStatus(status) {
  const valor = normalizarTexto(status);

  if (valor === "concluida") return "status-chip status-concluida";
  if (valor === "em andamento") return "status-chip status-andamento";
  if (valor === "atrasado") return "status-chip status-atrasado";
  return "status-chip status-pendente";
}

function obterClassePrioridade(prioridade) {
  const valor = normalizarTexto(prioridade);

  if (valor === "critica") return "priority-badge prioridade-critica";
  if (valor === "alta") return "priority-badge prioridade-alta";
  if (valor === "media") return "priority-badge prioridade-media";
  if (valor === "baixa") return "priority-badge prioridade-baixa";
  return "priority-badge";
}

function obterIndicadorPrazo(atividade) {
  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();
  const status = normalizarTexto(statusEfetivo(atividade));

  if (!prazo || status === "concluida") {
    return "";
  }

  const diasRestantes = diferencaEmDias(hoje, prazo);

  if (diasRestantes < 0) {
    return `<span class="prazo-alerta prazo-alerta-vermelho" title="Prazo atrasado"></span>`;
  }

  if (diasRestantes <= 2) {
    return `<span class="prazo-alerta prazo-alerta-laranja" title="Prazo próximo do vencimento"></span>`;
  }

  return "";
}

function obterIconesInformativos(atividade) {
  const statusAtual = normalizarTexto(atividade.status || "");
  const statusEfetivoAtual = normalizarTexto(statusEfetivo(atividade));

  const atividadeConcluida =
    statusAtual === "concluida" ||
    statusEfetivoAtual === "concluida";

  if (atividadeConcluida) {
    return "";
  }

  const possuiObservacoes = !!String(atividade.observacoes || "").trim();
  const possuiReuniaoPendente = !!atividade.data_reuniao;

  let html = `<div class="info-icons-wrap">`;

  if (possuiReuniaoPendente) {
    html += `
      <button
        type="button"
        class="info-icon-btn info-icon-reuniao pulse-icon"
        data-acao="ver-reuniao"
        data-id="${atividade.id}"
        title="Ver reunião"
      >
        📅
      </button>
    `;
  }

  if (possuiObservacoes) {
    html += `
      <button
        type="button"
        class="info-icon-btn info-icon-observacao pulse-icon"
        data-acao="ver-observacao"
        data-id="${atividade.id}"
        title="Ver observação"
      >
        📝
      </button>
    `;
  }

  html += `</div>`;
  return html;
}

function atualizarCards(lista) {
  if (cardTotal) cardTotal.textContent = lista.length;

  if (cardPendentes) {
    cardPendentes.textContent = lista.filter(
      (a) => normalizarTexto(statusEfetivo(a)) === "pendente"
    ).length;
  }

  if (cardAndamento) {
    cardAndamento.textContent = lista.filter(
      (a) => normalizarTexto(statusEfetivo(a)) === "em andamento"
    ).length;
  }

  if (cardAtrasadas) {
    cardAtrasadas.textContent = lista.filter(
      (a) => normalizarTexto(statusEfetivo(a)) === "atrasado"
    ).length;
  }

  if (cardConcluidas) {
    cardConcluidas.textContent = lista.filter(
      (a) => normalizarTexto(statusEfetivo(a)) === "concluida"
    ).length;
  }

  if (cardQualidade) {
    cardQualidade.textContent = lista.filter(
      (a) => normalizarTexto(a.tipo) === "qualidade"
    ).length;
  }

  if (cardDiversos) {
    cardDiversos.textContent = lista.filter(
      (a) => normalizarTexto(a.tipo) === "diversos"
    ).length;
  }

  if (cardReuniao) {
    cardReuniao.textContent = lista.filter(
      (a) => normalizarTexto(a.tipo) === "reuniao"
    ).length;
  }
}

function popularFiltroSetor(lista) {
  const setoresUnicos = [
    ...new Set(
      lista
        .flatMap((atividade) => quebrarSetores(atividade.setor))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  if (filtroSetorSelect) {
    const valorAtual = filtroSetorSelect.value;
    filtroSetorSelect.innerHTML = `<option value="">Todos</option>`;

    setoresUnicos.forEach((setor) => {
      const option = document.createElement("option");
      option.value = setor;
      option.textContent = setor;
      filtroSetorSelect.appendChild(option);
    });

    filtroSetorSelect.value = setoresUnicos.includes(valorAtual) ? valorAtual : "";
  }

  preencherDropdown("setor", setoresUnicos);
}

function popularDropdownsFixos() {
  preencherDropdown("tipo", ["QUALIDADE", "DIVERSOS", "REUNIÃO"]);
  preencherDropdown("prioridade", ["baixa", "média", "alta", "crítica"]);
  preencherDropdown("status", ["pendente", "em andamento", "atrasado", "concluída"]);
  preencherDropdown("prazo", ["hoje", "sem-prazo", "vencidas", "proximas"]);
}

function popularSelectSetores() {
  if (!setorSelect) return;

  setorSelect.innerHTML = `<option value="">Selecione um setor</option>`;

  setoresCache
    .filter((setor) => setor.ativo)
    .forEach((setor) => {
      const option = document.createElement("option");
      option.value = setor.nome;
      option.textContent = setor.nome;
      setorSelect.appendChild(option);
    });
}

function popularSelectResponsaveis() {
  if (!responsavelInput) return;

  const valorAtual = responsavelInput.value || usuario?.id || "";

  responsavelInput.innerHTML = `<option value="">Selecione um responsável</option>`;

  usuariosCache
    .filter((item) => item.ativo !== false)
    .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"))
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nome || item.username || "Usuário";
      responsavelInput.appendChild(option);
    });

  responsavelInput.value = valorAtual || usuario?.id || "";
}

function renderizarTabela(atividades) {
  if (!tabelaAtividades) return;

  if (!atividades.length) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Nenhuma atividade encontrada.</td>
      </tr>
    `;
    return;
  }

  tabelaAtividades.innerHTML = atividades
    .map((atividade) => {
      const status = statusEfetivo(atividade);
      const tipo = atividade.tipo || "-";
      const prioridade = atividade.prioridade || "-";

      const responsavelNome =
        atividade?.responsavel?.nome ||
        atividade?.criador?.nome ||
        usuariosCache.find((u) => String(u.id) === String(atividade.responsavel_id))?.nome ||
        usuario?.nome ||
        "-";

      const setoresTexto = atividade.setor || "-";
      const prazoIndicador = obterIndicadorPrazo(atividade);
      const iconesInformativos = obterIconesInformativos(atividade);

      const botoesAcoes = `
        <div class="acoes-botoes">
          <button type="button" class="btn-acao" data-acao="editar" data-id="${atividade.id}">
            Editar
          </button>

          ${
            normalizarTexto(status) !== "concluida"
              ? `<button type="button" class="btn-acao btn-concluir" data-acao="concluir" data-id="${atividade.id}">
                  Concluir
                </button>`
              : ""
          }

          ${
            ehAdmin
              ? `<button type="button" class="btn-acao btn-excluir" data-acao="excluir" data-id="${atividade.id}">
                  Excluir
                </button>`
              : ""
          }
        </div>
      `;

      return `
        <tr>
          <td>
            <div class="responsavel-wrap">
              <span>${escaparHtml(responsavelNome)}</span>
              ${iconesInformativos}
            </div>
          </td>
          <td>
            <div class="atividade-titulo">
              ${escaparHtml(atividade.titulo || "-")}
            </div>

            ${
              atividade.descricao
                ? `<div class="atividade-descricao">
                    ${escaparHtml(atividade.descricao)}
                  </div>`
                : ""
            }
          </td>
          <td>${escaparHtml(setoresTexto)}</td>
          <td>${escaparHtml(tipo)}</td>
          <td>
            <span class="${obterClassePrioridade(prioridade)}">
              ${escaparHtml(prioridade)}
            </span>
          </td>
          <td>
            <span class="${obterClasseStatus(status)}">
              ${escaparHtml(status)}
            </span>
          </td>
          <td>${formatarData(atividade.data_criacao)}</td>
          <td>
            <div class="prazo-wrap">
              ${prazoIndicador}
              <span>${formatarData(atividade.prazo)}</span>
            </div>
          </td>
          <td>${botoesAcoes}</td>
        </tr>
      `;
    })
    .join("");
}

function obterValoresFiltro(chave) {
  const dropdownTemValor = Array.isArray(filtrosSelecionados[chave]) && filtrosSelecionados[chave].length;
  if (dropdownTemValor) {
    return filtrosSelecionados[chave].map(normalizarTexto);
  }

  const mapaSelect = {
    tipo: filtroTipoSelect,
    prioridade: filtroPrioridadeSelect,
    status: filtroStatusSelect,
    prazo: filtroPrazoSelect,
    setor: filtroSetorSelect
  };

  const select = mapaSelect[chave];
  if (!select?.value) return [];

  return [normalizarTexto(select.value)];
}

function aplicarFiltros() {
  const termoBusca = normalizarTexto(filtroBusca?.value || "");
  const tiposSelecionados = obterValoresFiltro("tipo");
  const prioridadesSelecionadas = obterValoresFiltro("prioridade");
  const statusSelecionados = obterValoresFiltro("status");
  const prazosSelecionados = obterValoresFiltro("prazo");
  const setoresSelecionadosFiltro = obterValoresFiltro("setor");

  const hoje = obterHojeSemHora();

  const atividadesFiltradas = atividadesCache.filter((atividade) => {
    const titulo = normalizarTexto(atividade.titulo);
    const descricao = normalizarTexto(atividade.descricao);
    const observacoes = normalizarTexto(atividade.observacoes);
    const tipo = normalizarTexto(atividade.tipo);
    const setoresLista = quebrarSetores(atividade.setor).map(normalizarTexto);
    const prioridade = normalizarTexto(atividade.prioridade);
    const status = normalizarTexto(statusEfetivo(atividade));
    const prazo = obterDataSemHora(atividade.prazo);

    const atendeBusca =
      !termoBusca ||
      titulo.includes(termoBusca) ||
      descricao.includes(termoBusca) ||
      observacoes.includes(termoBusca) ||
      tipo.includes(termoBusca) ||
      setoresLista.some((setor) => setor.includes(termoBusca));

    const atendeTipo =
      !tiposSelecionados.length || tiposSelecionados.includes(tipo);

    const atendePrioridade =
      !prioridadesSelecionadas.length || prioridadesSelecionadas.includes(prioridade);

    const atendeStatus =
      !statusSelecionados.length || statusSelecionados.includes(status);

    const atendeSetor =
      !setoresSelecionadosFiltro.length ||
      setoresSelecionadosFiltro.some((setor) => setoresLista.includes(setor));

    let atendePrazo = true;

    if (prazosSelecionados.length) {
      atendePrazo = prazosSelecionados.some((prazoSelecionado) => {
        if (prazoSelecionado === "sem-prazo") {
          return !prazo;
        }

        if (prazoSelecionado === "hoje") {
          return !!prazo && prazo.getTime() === hoje.getTime();
        }

        if (prazoSelecionado === "vencidas") {
          return !!prazo && prazo < hoje;
        }

        if (prazoSelecionado === "proximas") {
          return !!prazo && prazo >= hoje;
        }

        return true;
      });
    }

    return (
      atendeBusca &&
      atendeTipo &&
      atendePrioridade &&
      atendeStatus &&
      atendePrazo &&
      atendeSetor
    );
  });

  atualizarCards(atividadesFiltradas);
  renderizarTabela(atividadesFiltradas);
}

function limparFiltros() {
  if (filtroBusca) filtroBusca.value = "";

  if (filtroTipoSelect) filtroTipoSelect.value = "";
  if (filtroPrioridadeSelect) filtroPrioridadeSelect.value = "";
  if (filtroStatusSelect) filtroStatusSelect.value = "";
  if (filtroPrazoSelect) filtroPrazoSelect.value = "";
  if (filtroSetorSelect) filtroSetorSelect.value = "";

  Object.keys(filtrosSelecionados).forEach((chave) => {
    filtrosSelecionados[chave] = [];
    atualizarResumoDropdown(chave);
  });

  Object.values(dropdownFilters).forEach((controle) => {
    if (!controle?.optionsWrap) return;
    controle.optionsWrap
      .querySelectorAll('input[type="checkbox"]')
      .forEach((input) => {
        input.checked = false;
      });
  });

  aplicarFiltros();
}

async function requisicaoJsonComFallback(rotas) {
  for (const rota of rotas) {
    try {
      const resposta = await fetch(rota, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const dados = await resposta.json().catch(() => null);

      if (resposta.ok) {
        return { ok: true, dados };
      }
    } catch (error) {
      // tenta a próxima
    }
  }

  return { ok: false, dados: null };
}

async function carregarUsuarios() {
  const resultado = await requisicaoJsonComFallback([
    `${API_BASE_URL}/usuarios/usuarios`,
    `${API_BASE_URL}/usuarios`
  ]);

  if (!resultado.ok) {
    usuariosCache = [];
    popularSelectResponsaveis();
    return;
  }

  usuariosCache = Array.isArray(resultado.dados) ? resultado.dados : [];
  popularSelectResponsaveis();
}

async function carregarSetores() {
  try {
    const resposta = await fetch(`${API_BASE_URL}/setores`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return;
    }

    setoresCache = Array.isArray(dados) ? dados : [];
    popularSelectSetores();
  } catch (error) {
    console.error("Erro ao carregar setores:", error);
  }
}

async function carregarAtividades() {
  if (tabelaAtividades) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">Carregando atividades.</td>
      </tr>
    `;
  }

  try {
    const resposta = await fetch(`${API_BASE_URL}/atividades`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      if (tabelaAtividades) {
        tabelaAtividades.innerHTML = `
          <tr>
            <td colspan="9" class="empty-state">
              ${escaparHtml(dados.erro || "Erro ao carregar atividades.")}
            </td>
          </tr>
        `;
      }
      return;
    }

    atividadesCache = Array.isArray(dados) ? dados : [];
    popularFiltroSetor(atividadesCache);
    aplicarFiltros();
  } catch (error) {
    if (tabelaAtividades) {
      tabelaAtividades.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state">Erro ao conectar com o servidor.</td>
        </tr>
      `;
    }
  }
}

tabelaAtividades?.addEventListener("click", async (event) => {
  const botao = event.target.closest("button[data-acao]");
  if (!botao) return;

  const { acao, id } = botao.dataset;
  const atividade = atividadesCache.find((item) => String(item.id) === String(id));

  if (
    (acao === "ver-reuniao" ||
      acao === "ver-observacao" ||
      acao === "editar" ||
      acao === "concluir") &&
    !atividade
  ) {
    alert("Atividade não encontrada.");
    return;
  }

  if (acao === "ver-reuniao") {
    const dataTexto = formatarData(atividade.data_reuniao);
    alert(`Reunião pendente\n\nData: ${dataTexto}`);
    return;
  }

  if (acao === "ver-observacao") {
    const observacaoTexto = atividade.observacoes || "Sem observações.";
    alert(`Observações\n\n${observacaoTexto}`);
    return;
  }

  if (acao === "editar") {
    prepararModalEdicao(atividade);
    return;
  }

  if (acao === "concluir") {
    const confirmar = confirm("Deseja marcar esta atividade como concluída?");
    if (!confirmar) return;

    try {
      const payload = {
        titulo: atividade.titulo || "",
        descricao: atividade.descricao || "",
        observacoes: atividade.observacoes || null,
        tipo: atividade.tipo || null,
        prioridade: atividade.prioridade || null,
        status: "concluída",
        prazo: atividade.prazo || null,
        setor: atividade.setor || null,
        data_reuniao: atividade.data_reuniao || null,
        responsavel_id:
          atividade.responsavel_id ||
          atividade?.responsavel?.id ||
          usuario?.id ||
          null
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

      await carregarAtividades();
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }

    return;
  }

  if (acao === "excluir") {
    if (!ehAdmin) {
      alert("Somente administradores podem excluir atividades.");
      return;
    }

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

      await carregarAtividades();
    } catch (error) {
      alert("Erro ao conectar com o servidor.");
    }
  }
});

async function iniciarPagina() {
  popularDropdownsFixos();
  await carregarUsuarios();
  await carregarSetores();
  await carregarAtividades();
}

iniciarPagina();
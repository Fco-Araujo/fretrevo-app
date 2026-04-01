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
const filtroTipo = document.getElementById("filtroTipo");
const filtroPrioridade = document.getElementById("filtroPrioridade");
const filtroStatus = document.getElementById("filtroStatus");
const filtroPrazo = document.getElementById("filtroPrazo");
const filtroSetor = document.getElementById("filtroSetor");

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

const setorSelect = document.getElementById("setorSelect");
const adicionarSetorBtn = document.getElementById("adicionarSetorBtn");
const setoresSelecionadosEl = document.getElementById("setoresSelecionados");

const dataReuniaoInput = document.getElementById("dataReuniao");

const modalTitulo = document.querySelector(".modal-header h3");
const botaoSubmitModal = atividadeForm?.querySelector('button[type="submit"]');

let atividadesCache = [];
let setoresCache = [];
let setoresSelecionados = [];

let modoEdicao = false;
let atividadeEditandoId = null;

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

recarregarBtn?.addEventListener("click", async () => {
  await carregarSetores();
  await carregarAtividades();
});

limparFiltrosBtn?.addEventListener("click", limparFiltros);

[
  filtroBusca,
  filtroTipo,
  filtroPrioridade,
  filtroStatus,
  filtroPrazo,
  filtroSetor
].forEach((elemento) => {
  if (!elemento) return;
  elemento.addEventListener("input", aplicarFiltros);
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

  const payload = {
    titulo: tituloInput?.value.trim() || "",
    descricao: descricaoInput?.value.trim() || "",
    observacoes: observacoesInput?.value.trim() || null,
    tipo: tipoInput?.value || null,
    prioridade: prioridadeInput?.value || null,
    status: statusInput?.value || null,
    prazo: prazoInput?.value || null,
    setor: setoresSelecionados.length ? setoresSelecionados.join(", ") : null,
    data_reuniao: dataReuniaoInput?.value || null
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
  if (!filtroSetor) return;

  const valorAtual = filtroSetor.value;

  const setoresUnicos = [
    ...new Set(
      lista
        .flatMap((atividade) => quebrarSetores(atividade.setor))
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroSetor.innerHTML = `<option value="">Todos</option>`;

  setoresUnicos.forEach((setor) => {
    const option = document.createElement("option");
    option.value = setor;
    option.textContent = setor;
    filtroSetor.appendChild(option);
  });

  filtroSetor.value = setoresUnicos.includes(valorAtual) ? valorAtual : "";
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
        atividade?.criador?.nome ||
        atividade?.responsavel?.nome ||
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

function aplicarFiltros() {
  const termoBusca = normalizarTexto(filtroBusca?.value || "");
  const tipoSelecionado = normalizarTexto(filtroTipo?.value || "");
  const prioridadeSelecionada = normalizarTexto(filtroPrioridade?.value || "");
  const statusSelecionado = normalizarTexto(filtroStatus?.value || "");
  const prazoSelecionado = normalizarTexto(filtroPrazo?.value || "");
  const setorSelecionado = normalizarTexto(filtroSetor?.value || "");

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
      !tipoSelecionado || tipo === tipoSelecionado;

    const atendePrioridade =
      !prioridadeSelecionada || prioridade === prioridadeSelecionada;

    const atendeStatus =
      !statusSelecionado || status === statusSelecionado;

    const atendeSetor =
      !setorSelecionado || setoresLista.includes(setorSelecionado);

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
  if (filtroTipo) filtroTipo.value = "";
  if (filtroPrioridade) filtroPrioridade.value = "";
  if (filtroStatus) filtroStatus.value = "";
  if (filtroPrazo) filtroPrazo.value = "";
  if (filtroSetor) filtroSetor.value = "";
  aplicarFiltros();
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
        data_reuniao: atividade.data_reuniao || null
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
  await carregarSetores();
  await carregarAtividades();
}

iniciarPagina();
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

const logoutBtn = document.getElementById("logoutBtn");
const recarregarBtn = document.getElementById("recarregarBtn");
const limparFiltrosBtn = document.getElementById("limparFiltrosBtn");

const filtroBusca = document.getElementById("filtroBusca");
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
const prioridadeInput = document.getElementById("prioridade");
const statusInput = document.getElementById("status");
const prazoInput = document.getElementById("prazo");
const setorInput = document.getElementById("setor");
const dataReuniaoInput = document.getElementById("dataReuniao");

const modalTitulo = document.querySelector(".modal-header h3");
const botaoSubmitModal = atividadeForm?.querySelector('button[type="submit"]');

let atividadesCache = [];
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

recarregarBtn?.addEventListener("click", carregarAtividades);
limparFiltrosBtn?.addEventListener("click", limparFiltros);

[filtroBusca, filtroPrioridade, filtroStatus, filtroPrazo, filtroSetor].forEach((elemento) => {
  if (!elemento) return;
  elemento.addEventListener("input", aplicarFiltros);
  elemento.addEventListener("change", aplicarFiltros);
});

atividadeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  limparMensagemFormulario();

  const payload = {
    titulo: tituloInput?.value.trim() || "",
    descricao: descricaoInput?.value.trim() || "",
    prioridade: prioridadeInput?.value || null,
    status: statusInput?.value || null,
    prazo: prazoInput?.value || null,
    setor: setorInput?.value.trim() || null,
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

  if (tituloInput) tituloInput.disabled = false;
  if (descricaoInput) descricaoInput.disabled = false;
  if (prazoInput) prazoInput.disabled = false;
  if (prioridadeInput) prioridadeInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (setorInput) setorInput.disabled = false;
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
  if (prioridadeInput) prioridadeInput.value = atividade.prioridade || "";
  if (statusInput) statusInput.value = normalizarStatusOriginal(atividade.status);
  if (prazoInput) prazoInput.value = formatarDataParaInput(atividade.prazo);
  if (setorInput) setorInput.value = atividade.setor || "";
  if (dataReuniaoInput) {
    dataReuniaoInput.value = formatarDataParaInput(atividade.data_reuniao);
  }

  if (ehAdmin) {
    if (tituloInput) tituloInput.disabled = false;
    if (descricaoInput) descricaoInput.disabled = false;
    if (prazoInput) prazoInput.disabled = false;
  } else {
    if (tituloInput) tituloInput.disabled = true;
    if (descricaoInput) descricaoInput.disabled = true;
    if (prazoInput) prazoInput.disabled = true;
  }

  if (prioridadeInput) prioridadeInput.disabled = false;
  if (statusInput) statusInput.disabled = false;
  if (setorInput) setorInput.disabled = false;
  if (dataReuniaoInput) dataReuniaoInput.disabled = false;

  modalOverlay?.classList.remove("hidden");
}

function resetarModoEdicao() {
  modoEdicao = false;
  atividadeEditandoId = null;

  if (modalTitulo) modalTitulo.textContent = "Nova atividade";
  if (botaoSubmitModal) botaoSubmitModal.textContent = "Salvar atividade";
}

function fecharModal() {
  modalOverlay?.classList.add("hidden");
  limparMensagemFormulario();
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
}

function popularFiltroSetor(lista) {
  if (!filtroSetor) return;

  const valorAtual = filtroSetor.value;

  const setoresUnicos = [
    ...new Set(
      lista
        .map((atividade) => (atividade.setor || "").trim())
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

function renderizarTabela(atividades) {
  if (!tabelaAtividades) return;

  if (!atividades.length) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">Nenhuma atividade encontrada.</td>
      </tr>
    `;
    return;
  }

  tabelaAtividades.innerHTML = atividades
    .map((atividade) => {
      const status = statusEfetivo(atividade);
      const prioridade = atividade.prioridade || "-";

      const responsavelNome =
        atividade?.criador?.nome ||
        atividade?.responsavel?.nome ||
        usuario?.nome ||
        "-";

      const setor = atividade.setor || "-";
      const temReuniao = !!atividade.data_reuniao;
      const atividadeConcluida = normalizarTexto(status) === "concluida";

      const reuniaoHtml = temReuniao
        ? `
          <div class="reuniao-wrap">
            ${!atividadeConcluida ? `<span class="reuniao-alerta"></span>` : ""}
            <span class="reuniao-data">${formatarData(atividade.data_reuniao)}</span>
          </div>
        `
        : `<span class="reuniao-vazia">-</span>`;

      const botoesAcoes = `
        <div class="acoes-botoes">
          <button type="button" class="btn-acao" data-acao="editar" data-id="${atividade.id}">
            Editar
          </button>

          ${
            normalizarTexto(status) !== "concluida"
              ? `
                <button type="button" class="btn-acao btn-concluir" data-acao="concluir" data-id="${atividade.id}">
                  Concluir
                </button>
              `
              : ""
          }

          ${
            ehAdmin
              ? `
                <button type="button" class="btn-acao btn-excluir" data-acao="excluir" data-id="${atividade.id}">
                  Excluir
                </button>
              `
              : ""
          }
        </div>
      `;

      return `
        <tr>
          <td>${escaparHtml(responsavelNome)}</td>
          <td>${escaparHtml(atividade.titulo || "-")}</td>
          <td>${escaparHtml(atividade.descricao || "-")}</td>
          <td>${escaparHtml(setor)}</td>
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
          <td>${formatarData(atividade.prazo)}</td>
          <td>${reuniaoHtml}</td>
          <td>${botoesAcoes}</td>
        </tr>
      `;
    })
    .join("");
}

function aplicarFiltros() {
  const termoBusca = normalizarTexto(filtroBusca?.value || "");
  const prioridadeSelecionada = normalizarTexto(filtroPrioridade?.value || "");
  const statusSelecionado = normalizarTexto(filtroStatus?.value || "");
  const prazoSelecionado = normalizarTexto(filtroPrazo?.value || "");
  const setorSelecionado = normalizarTexto(filtroSetor?.value || "");

  const hoje = obterHojeSemHora();

  const atividadesFiltradas = atividadesCache.filter((atividade) => {
    const titulo = normalizarTexto(atividade.titulo);
    const descricao = normalizarTexto(atividade.descricao);
    const setor = normalizarTexto(atividade.setor);
    const prioridade = normalizarTexto(atividade.prioridade);
    const status = normalizarTexto(statusEfetivo(atividade));
    const prazo = obterDataSemHora(atividade.prazo);

    const atendeBusca =
      !termoBusca ||
      titulo.includes(termoBusca) ||
      descricao.includes(termoBusca) ||
      setor.includes(termoBusca);

    const atendePrioridade =
      !prioridadeSelecionada || prioridade === prioridadeSelecionada;

    const atendeStatus =
      !statusSelecionado || status === statusSelecionado;

    const atendeSetor =
      !setorSelecionado || setor === setorSelecionado;

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
  if (filtroPrioridade) filtroPrioridade.value = "";
  if (filtroStatus) filtroStatus.value = "";
  if (filtroPrazo) filtroPrazo.value = "";
  if (filtroSetor) filtroSetor.value = "";
  aplicarFiltros();
}

async function carregarAtividades() {
  if (tabelaAtividades) {
    tabelaAtividades.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">Carregando atividades.</td>
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
            <td colspan="10" class="empty-state">
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
          <td colspan="10" class="empty-state">Erro ao conectar com o servidor.</td>
        </tr>
      `;
    }
  }
}

tabelaAtividades?.addEventListener("click", async (event) => {
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

carregarAtividades();
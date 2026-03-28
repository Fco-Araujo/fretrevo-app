import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token) {
  window.location.href = "./index.html";
}

const boasVindas = document.getElementById("boasVindas");
const menuUsuariosLink = document.getElementById("menuUsuariosLink");
const logoutBtn = document.getElementById("logoutBtn");

const cardTotalComPrazo = document.getElementById("cardTotalComPrazo");
const cardAtrasadas = document.getElementById("cardAtrasadas");
const cardProximas = document.getElementById("cardProximas");
const cardHoje = document.getElementById("cardHoje");
const textoAtrasadas = document.getElementById("textoAtrasadas");
const textoProximas = document.getElementById("textoProximas");

const filtroBuscaPrazo = document.getElementById("filtroBuscaPrazo");
const filtroResponsavelPrazo = document.getElementById("filtroResponsavelPrazo");
const filtroPrioridadePrazo = document.getElementById("filtroPrioridadePrazo");
const filtroOrigemPrazo = document.getElementById("filtroOrigemPrazo");
const limparFiltrosBtn = document.getElementById("limparFiltrosBtn");
const recarregarBtn = document.getElementById("recarregarBtn");

const tabelaAtrasos = document.getElementById("tabelaAtrasos");
const tabelaProximas = document.getElementById("tabelaProximas");
const rankingAtrasos = document.getElementById("rankingAtrasos");
const graficoStatusPrazo = document.getElementById("graficoStatusPrazo");

let atividadesCache = [];

boasVindas.textContent = usuario?.nome || "Usuário";

if (usuario?.perfil === "admin" && menuUsuariosLink) {
  menuUsuariosLink.classList.remove("hidden");
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

recarregarBtn.addEventListener("click", carregarAtividades);

limparFiltrosBtn.addEventListener("click", () => {
  filtroBuscaPrazo.value = "";
  filtroResponsavelPrazo.value = "";
  filtroPrioridadePrazo.value = "";
  filtroOrigemPrazo.value = "";
  aplicarFiltros();
});

[
  filtroBuscaPrazo,
  filtroResponsavelPrazo,
  filtroPrioridadePrazo,
  filtroOrigemPrazo
].forEach((elemento) => {
  elemento.addEventListener("input", aplicarFiltros);
  elemento.addEventListener("change", aplicarFiltros);
});

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

  const dt = new Date(data);
  if (Number.isNaN(dt.getTime())) return null;

  dt.setHours(0, 0, 0, 0);
  return dt;
}

function diferencaEmDias(dataInicial, dataFinal) {
  const umDia = 1000 * 60 * 60 * 24;
  return Math.round((dataFinal - dataInicial) / umDia);
}

function formatarData(data) {
  if (!data) return "-";
  return new Date(data).toLocaleDateString("pt-BR");
}

function obterStatusOriginal(status) {
  const texto = normalizarTexto(status);

  if (texto === "concluida" || texto === "concluída") return "concluída";
  if (texto === "em andamento") return "em andamento";
  if (texto === "pendente") return "pendente";
  if (texto === "atrasado") return "atrasado";

  return texto;
}

function estaConcluida(atividade) {
  const status = obterStatusOriginal(atividade.status);
  return status === "concluída";
}

function obterDiasAtraso(atividade) {
  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();

  if (!prazo || estaConcluida(atividade)) return 0;

  const dias = diferencaEmDias(prazo, hoje);
  return dias > 0 ? dias : 0;
}

function obterDiasRestantes(atividade) {
  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();

  if (!prazo || estaConcluida(atividade)) return null;

  return diferencaEmDias(hoje, prazo);
}

function atividadeAtrasada(atividade) {
  return obterDiasAtraso(atividade) > 0;
}

function atividadeVenceHoje(atividade) {
  const dias = obterDiasRestantes(atividade);
  return dias === 0;
}

function atividadeProxima(atividade) {
  const dias = obterDiasRestantes(atividade);
  return dias !== null && dias >= 0 && dias <= 7;
}

function obterDescricao(atividade) {
  return atividade.descricao?.trim() || atividade.titulo || "-";
}

function obterResponsavel(atividade) {
  return atividade.criador?.nome || "-";
}

function preencherFiltroResponsavel(atividades) {
  const responsaveis = [...new Set(
    atividades
      .map((item) => item.criador?.nome)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
  )];

  const valorAtual = filtroResponsavelPrazo.value;

  filtroResponsavelPrazo.innerHTML = `<option value="">Todos</option>` +
    responsaveis
      .map((nome) => `<option value="${nome}">${nome}</option>`)
      .join("");

  filtroResponsavelPrazo.value = valorAtual;
}

function atualizarCards(atividadesFiltradas) {
  const comPrazo = atividadesFiltradas.filter((item) => obterDataSemHora(item.prazo));
  const atrasadas = atividadesFiltradas.filter(atividadeAtrasada);
  const proximas = atividadesFiltradas.filter(atividadeProxima);
  const hoje = atividadesFiltradas.filter(atividadeVenceHoje);

  cardTotalComPrazo.textContent = comPrazo.length;
  cardAtrasadas.textContent = atrasadas.length;
  cardProximas.textContent = proximas.length;
  cardHoje.textContent = hoje.length;

  if (atrasadas.length > 0) {
    const maiorAtraso = Math.max(...atrasadas.map(obterDiasAtraso));
    textoAtrasadas.textContent = `Maior atraso: ${maiorAtraso} dia(s)`;
  } else {
    textoAtrasadas.textContent = "Sem atividades em atraso";
  }

  if (proximas.length > 0) {
    const menorPrazo = Math.min(...proximas.map((item) => obterDiasRestantes(item)));
    textoProximas.textContent = `Mais próxima vence em ${menorPrazo} dia(s)`;
  } else {
    textoProximas.textContent = "Nenhum vencimento próximo";
  }
}

function renderizarTabelaAtrasos(atrasadas) {
  if (!atrasadas.length) {
    tabelaAtrasos.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Nenhuma atividade em atraso.</td>
      </tr>
    `;
    return;
  }

  tabelaAtrasos.innerHTML = atrasadas
    .sort((a, b) => obterDiasAtraso(b) - obterDiasAtraso(a))
    .map((atividade) => `
      <tr>
        <td>${obterDescricao(atividade)}</td>
        <td>${obterResponsavel(atividade)}</td>
        <td>${formatarData(atividade.prazo)}</td>
        <td>
          <span class="badge badge-atrasado">
            ${obterDiasAtraso(atividade)} dia(s)
          </span>
        </td>
      </tr>
    `)
    .join("");
}

function renderizarTabelaProximas(proximas) {
  if (!proximas.length) {
    tabelaProximas.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Nenhuma atividade vencendo nos próximos 7 dias.</td>
      </tr>
    `;
    return;
  }

  tabelaProximas.innerHTML = proximas
    .sort((a, b) => obterDiasRestantes(a) - obterDiasRestantes(b))
    .map((atividade) => {
      const diasRestantes = obterDiasRestantes(atividade);
      const rotulo = diasRestantes === 0 ? "Hoje" : `${diasRestantes} dia(s)`;

      return `
        <tr>
          <td>${obterDescricao(atividade)}</td>
          <td>${obterResponsavel(atividade)}</td>
          <td>${formatarData(atividade.prazo)}</td>
          <td>
            <span class="badge badge-media">
              ${rotulo}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderizarRankingAtrasos(atrasadas) {
  if (!atrasadas.length) {
    rankingAtrasos.innerHTML = `<p class="empty-state-bloco">Nenhuma atividade em atraso.</p>`;
    return;
  }

  rankingAtrasos.innerHTML = atrasadas
    .sort((a, b) => obterDiasAtraso(b) - obterDiasAtraso(a))
    .slice(0, 5)
    .map((atividade, index) => `
      <article class="ranking-item">
        <div class="ranking-left">
          <div class="ranking-posicao atraso">${index + 1}</div>
          <div>
            <strong>${obterDescricao(atividade)}</strong>
            <p>${obterResponsavel(atividade)} • prazo ${formatarData(atividade.prazo)}</p>
          </div>
        </div>
        <div class="ranking-badge atraso">${obterDiasAtraso(atividade)}d</div>
      </article>
    `)
    .join("");
}

function renderizarGrafico(atividadesFiltradas) {
  const totalAtrasadas = atividadesFiltradas.filter(atividadeAtrasada).length;
  const totalHoje = atividadesFiltradas.filter(atividadeVenceHoje).length;
  const totalProximas = atividadesFiltradas.filter(
    (item) => atividadeProxima(item) && !atividadeVenceHoje(item)
  ).length;

  const totalFuturas = atividadesFiltradas.filter((item) => {
    const dias = obterDiasRestantes(item);
    return dias !== null && dias > 7 && !estaConcluida(item);
  }).length;

  const dados = [
    { label: "Atrasadas", valor: totalAtrasadas, classe: "critico" },
    { label: "Hoje", valor: totalHoje, classe: "hoje" },
    { label: "Próximas", valor: totalProximas, classe: "proximo" },
    { label: "Futuras", valor: totalFuturas, classe: "futuro" }
  ];

  const maiorValor = Math.max(...dados.map((item) => item.valor), 1);

  graficoStatusPrazo.innerHTML = dados
    .map((item) => {
      const largura = (item.valor / maiorValor) * 100;

      return `
        <div class="bar-row">
          <div class="bar-label">${item.label}</div>
          <div class="bar-track">
            <div class="bar-fill ${item.classe}" style="width: ${largura}%"></div>
          </div>
          <div class="bar-value">${item.valor}</div>
        </div>
      `;
    })
    .join("");
}

function aplicarFiltros() {
  const busca = normalizarTexto(filtroBuscaPrazo.value);
  const responsavel = normalizarTexto(filtroResponsavelPrazo.value);
  const prioridade = normalizarTexto(filtroPrioridadePrazo.value);
  const faixa = normalizarTexto(filtroOrigemPrazo.value);

  const atividadesFiltradas = atividadesCache.filter((atividade) => {
    const descricao = normalizarTexto(obterDescricao(atividade));
    const nomeResponsavel = normalizarTexto(obterResponsavel(atividade));
    const prioridadeAtividade = normalizarTexto(atividade.prioridade);

    const atendeBusca =
      !busca ||
      descricao.includes(busca) ||
      nomeResponsavel.includes(busca);

    const atendeResponsavel =
      !responsavel || nomeResponsavel === responsavel;

    const atendePrioridade =
      !prioridade || prioridadeAtividade === prioridade;

    let atendeFaixa = true;

    if (faixa === "atrasadas") {
      atendeFaixa = atividadeAtrasada(atividade);
    } else if (faixa === "proximas") {
      atendeFaixa = atividadeProxima(atividade);
    } else if (faixa === "hoje") {
      atendeFaixa = atividadeVenceHoje(atividade);
    }

    return atendeBusca && atendeResponsavel && atendePrioridade && atendeFaixa;
  });

  const atrasadas = atividadesFiltradas.filter(atividadeAtrasada);
  const proximas = atividadesFiltradas.filter(
    (item) => atividadeProxima(item) && !atividadeAtrasada(item)
  );

  atualizarCards(atividadesFiltradas);
  renderizarGrafico(atividadesFiltradas);
  renderizarRankingAtrasos(atrasadas);
  renderizarTabelaAtrasos(atrasadas);
  renderizarTabelaProximas(proximas);
}

async function carregarAtividades() {
  tabelaAtrasos.innerHTML = `
    <tr>
      <td colspan="4" class="empty-state">Carregando dados.</td>
    </tr>
  `;

  tabelaProximas.innerHTML = `
    <tr>
      <td colspan="4" class="empty-state">Carregando dados.</td>
    </tr>
  `;

  rankingAtrasos.innerHTML = `<p class="empty-state-bloco">Carregando ranking.</p>`;
  graficoStatusPrazo.innerHTML = "";

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

      tabelaAtrasos.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">${dados.erro || "Erro ao carregar atividades."}</td>
        </tr>
      `;

      tabelaProximas.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">${dados.erro || "Erro ao carregar atividades."}</td>
        </tr>
      `;

      rankingAtrasos.innerHTML = `<p class="empty-state-bloco">Erro ao carregar ranking.</p>`;
      return;
    }

    atividadesCache = Array.isArray(dados)
      ? dados.filter((item) => obterDataSemHora(item.prazo))
      : [];

    preencherFiltroResponsavel(atividadesCache);
    aplicarFiltros();
  } catch (error) {
    tabelaAtrasos.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Erro ao conectar com o servidor.</td>
      </tr>
    `;

    tabelaProximas.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">Erro ao conectar com o servidor.</td>
      </tr>
    `;

    rankingAtrasos.innerHTML = `<p class="empty-state-bloco">Erro ao conectar com o servidor.</p>`;
  }
}

carregarAtividades();
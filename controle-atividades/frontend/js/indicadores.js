import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario"));

if (!token) {
  window.location.href = "./index.html";
}

const menuUsuariosLink = document.getElementById("menuUsuariosLink");
const logoutBtn = document.getElementById("logoutBtn");

const cardPctConcluidas = document.getElementById("cardPctConcluidas");
const cardPctPendentes = document.getElementById("cardPctPendentes");
const cardPctNoPrazo = document.getElementById("cardPctNoPrazo");
const cardAtrasadas = document.getElementById("cardAtrasadas");

const cardQtdConcluidas = document.getElementById("cardQtdConcluidas");
const cardQtdPendentes = document.getElementById("cardQtdPendentes");
const cardQtdNoPrazo = document.getElementById("cardQtdNoPrazo");
const cardQtdAtrasadas = document.getElementById("cardQtdAtrasadas");

const cardTendenciaConcluidas = document.getElementById("cardTendenciaConcluidas");
const cardTendenciaPrazo = document.getElementById("cardTendenciaPrazo");

const rankingProdutividade = document.getElementById("rankingProdutividade");
const rankingAtrasos = document.getElementById("rankingAtrasos");

const filtroStatus = document.getElementById("filtroStatus");
const filtroPrioridade = document.getElementById("filtroPrioridade");
const filtroCriador = document.getElementById("filtroCriador");
const filtroPeriodo = document.getElementById("filtroPeriodo");
const btnAplicarFiltros = document.getElementById("btnAplicarFiltros");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");

let atividadesOriginais = [];
let graficoLinha = null;
let graficoRosca = null;
let graficoPrioridade = null;
let graficoAtrasosUsuarios = null;

if (usuario?.perfil === "admin" && menuUsuariosLink) {
  menuUsuariosLink.classList.remove("hidden");
}

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "./index.html";
});

btnAplicarFiltros.addEventListener("click", () => {
  const filtradas = aplicarFiltros(atividadesOriginais);
  renderizarTudo(filtradas);
});

btnLimparFiltros.addEventListener("click", () => {
  filtroStatus.value = "";
  filtroPrioridade.value = "";
  filtroCriador.value = "";
  filtroPeriodo.value = "";
  renderizarTudo(atividadesOriginais);
});

function normalizarTexto(valor) {
  return (valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatarPercentual(valor) {
  return `${valor.toFixed(1)}%`;
}

function obterNomeUsuario(atividade) {
  return atividade.criador?.nome || atividade.criador?.username || "Não informado";
}

function atividadeEstaConcluida(atividade) {
  return normalizarTexto(atividade.status) === "concluida";
}

function atividadeEstaAtrasada(atividade) {
  if (!atividade.prazo) return false;
  if (atividadeEstaConcluida(atividade)) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const prazo = new Date(atividade.prazo);
  prazo.setHours(0, 0, 0, 0);

  return prazo < hoje;
}

function atividadeNoPrazo(atividade) {
  if (!atividade.prazo) return false;

  const prazo = new Date(atividade.prazo);
  prazo.setHours(0, 0, 0, 0);

  if (atividadeEstaConcluida(atividade)) {
    if (!atividade.data_conclusao) return false;

    const conclusao = new Date(atividade.data_conclusao);
    conclusao.setHours(0, 0, 0, 0);

    return conclusao <= prazo;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return hoje <= prazo;
}

function preencherFiltroCriador(atividades) {
  const nomes = [...new Set(atividades.map(obterNomeUsuario))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  filtroCriador.innerHTML = `<option value="">Todos</option>` +
    nomes.map((nome) => `<option value="${nome}">${nome}</option>`).join("");
}

function aplicarFiltros(atividades) {
  return atividades.filter((atividade) => {
    const nomeCriador = obterNomeUsuario(atividade);
    const status = normalizarTexto(atividade.status);
    const prioridade = normalizarTexto(atividade.prioridade);

    const filtroStatusNormalizado = normalizarTexto(filtroStatus.value);
    const filtroPrioridadeNormalizado = normalizarTexto(filtroPrioridade.value);
    const filtroCriadorValor = filtroCriador.value;
    const filtroPeriodoValor = Number(filtroPeriodo.value);

    let passouStatus = true;
    let passouPrioridade = true;
    let passouCriador = true;
    let passouPeriodo = true;

    if (filtroStatusNormalizado) {
      passouStatus = status === filtroStatusNormalizado;
    }

    if (filtroPrioridadeNormalizado) {
      passouPrioridade = prioridade === filtroPrioridadeNormalizado;
    }

    if (filtroCriadorValor) {
      passouCriador = nomeCriador === filtroCriadorValor;
    }

    if (filtroPeriodoValor) {
      if (!atividade.data_criacao) {
        passouPeriodo = false;
      } else {
        const hoje = new Date();
        const dataCriacao = new Date(atividade.data_criacao);
        const diffMs = hoje - dataCriacao;
        const diffDias = diffMs / (1000 * 60 * 60 * 24);
        passouPeriodo = diffDias <= filtroPeriodoValor;
      }
    }

    return passouStatus && passouPrioridade && passouCriador && passouPeriodo;
  });
}

function atualizarCards(atividades) {
  const total = atividades.length;

  if (!total) {
    cardPctConcluidas.textContent = "0%";
    cardPctPendentes.textContent = "0%";
    cardPctNoPrazo.textContent = "0%";
    cardAtrasadas.textContent = "0";

    cardQtdConcluidas.textContent = "0 atividades concluídas";
    cardQtdPendentes.textContent = "0 atividades pendentes";
    cardQtdNoPrazo.textContent = "0 atividades no prazo";
    cardQtdAtrasadas.textContent = "0 atividades atrasadas";

    cardTendenciaConcluidas.textContent = "-";
    cardTendenciaConcluidas.className = "card-trend";
    cardTendenciaPrazo.textContent = "-";
    cardTendenciaPrazo.className = "card-trend";
    return;
  }

  const concluidas = atividades.filter(atividadeEstaConcluida).length;
  const pendentes = atividades.filter((atividade) => normalizarTexto(atividade.status) === "pendente").length;
  const comPrazo = atividades.filter((atividade) => !!atividade.prazo);
  const noPrazo = comPrazo.filter(atividadeNoPrazo).length;
  const atrasadas = atividades.filter(atividadeEstaAtrasada).length;

  const pctConcluidas = (concluidas / total) * 100;
  const pctPendentes = (pendentes / total) * 100;
  const pctNoPrazo = comPrazo.length ? (noPrazo / comPrazo.length) * 100 : 0;

  cardPctConcluidas.textContent = formatarPercentual(pctConcluidas);
  cardPctPendentes.textContent = formatarPercentual(pctPendentes);
  cardPctNoPrazo.textContent = formatarPercentual(pctNoPrazo);
  cardAtrasadas.textContent = atrasadas;

  cardQtdConcluidas.textContent = `${concluidas} atividade(s) concluída(s)`;
  cardQtdPendentes.textContent = `${pendentes} atividade(s) pendente(s)`;
  cardQtdNoPrazo.textContent = `${noPrazo} atividade(s) no prazo`;
  cardQtdAtrasadas.textContent = `${atrasadas} atividade(s) atrasada(s)`;

  if (pctConcluidas >= 50) {
    cardTendenciaConcluidas.textContent = "▲ Bom ritmo";
    cardTendenciaConcluidas.className = "card-trend positivo";
  } else {
    cardTendenciaConcluidas.textContent = "▼ Abaixo do ideal";
    cardTendenciaConcluidas.className = "card-trend negativo";
  }

  if (pctNoPrazo >= 80) {
    cardTendenciaPrazo.textContent = "▲ Dentro da meta";
    cardTendenciaPrazo.className = "card-trend positivo";
  } else {
    cardTendenciaPrazo.textContent = "▼ Fora da meta";
    cardTendenciaPrazo.className = "card-trend negativo";
  }
}

function gerarGraficoLinha(atividades) {
  const mapa = {};

  atividades.forEach((atividade) => {
    if (!atividade.data_criacao) return;

    const data = new Date(atividade.data_criacao);
    const chave = `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`;
    mapa[chave] = (mapa[chave] || 0) + 1;
  });

  const labels = Object.keys(mapa);
  const valores = Object.values(mapa);

  const ctx = document.getElementById("graficoLinha");

  if (graficoLinha) graficoLinha.destroy();

  graficoLinha = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Atividades criadas",
          data: valores,
          borderWidth: 3,
          tension: 0.35,
          fill: false,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });
}

function gerarGraficoRosca(atividades) {
  const pendentes = atividades.filter((atividade) => normalizarTexto(atividade.status) === "pendente").length;
  const andamento = atividades.filter((atividade) => normalizarTexto(atividade.status) === "em andamento").length;
  const concluidas = atividades.filter(atividadeEstaConcluida).length;

  const ctx = document.getElementById("graficoRosca");

  if (graficoRosca) graficoRosca.destroy();

  graficoRosca = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pendentes", "Em andamento", "Concluídas"],
      datasets: [
        {
          data: [pendentes, andamento, concluidas],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#e5e7eb",
            padding: 18
          }
        }
      }
    }
  });
}

function gerarGraficoPrioridade(atividades) {
  const prioridades = ["baixa", "media", "alta", "critica"];
  const labels = ["Baixa", "Média", "Alta", "Crítica"];

  const valores = prioridades.map((prioridade) =>
    atividades.filter((atividade) => normalizarTexto(atividade.prioridade) === prioridade).length
  );

  const ctx = document.getElementById("graficoPrioridade");

  if (graficoPrioridade) graficoPrioridade.destroy();

  graficoPrioridade = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Quantidade",
          data: valores,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });
}

function gerarGraficoAtrasosUsuarios(atividades) {
  const mapa = {};

  atividades.forEach((atividade) => {
    if (!atividadeEstaAtrasada(atividade)) return;
    const nome = obterNomeUsuario(atividade);
    mapa[nome] = (mapa[nome] || 0) + 1;
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const labels = ranking.map(([nome]) => nome);
  const valores = ranking.map(([, total]) => total);

  const ctx = document.getElementById("graficoAtrasosUsuarios");

  if (graficoAtrasosUsuarios) graficoAtrasosUsuarios.destroy();

  graficoAtrasosUsuarios = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Atrasos",
          data: valores,
          borderRadius: 8
        }
      ]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: "#e5e7eb" } }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        y: {
          ticks: { color: "#9ca3af" },
          grid: { display: false }
        }
      }
    }
  });
}

function gerarRankingProdutividade(atividades) {
  const mapa = {};

  atividades.forEach((atividade) => {
    const nome = obterNomeUsuario(atividade);
    mapa[nome] = (mapa[nome] || 0) + 1;
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!ranking.length) {
    rankingProdutividade.innerHTML = `<div class="empty-state-bloco">Sem dados para o ranking.</div>`;
    return;
  }

  rankingProdutividade.innerHTML = ranking.map(([nome, total], index) => `
    <div class="ranking-item">
      <div class="ranking-left">
        <span class="ranking-posicao">${index + 1}</span>
        <div>
          <strong>${nome}</strong>
          <p>${total} atividade(s)</p>
        </div>
      </div>
      <div class="ranking-right">
        <span class="ranking-badge">${total}</span>
      </div>
    </div>
  `).join("");
}

function gerarRankingAtrasos(atividades) {
  const mapa = {};

  atividades.forEach((atividade) => {
    if (!atividadeEstaAtrasada(atividade)) return;
    const nome = obterNomeUsuario(atividade);
    mapa[nome] = (mapa[nome] || 0) + 1;
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!ranking.length) {
    rankingAtrasos.innerHTML = `<div class="empty-state-bloco">Nenhum atraso encontrado.</div>`;
    return;
  }

  rankingAtrasos.innerHTML = ranking.map(([nome, total], index) => `
    <div class="ranking-item">
      <div class="ranking-left">
        <span class="ranking-posicao atraso">${index + 1}</span>
        <div>
          <strong>${nome}</strong>
          <p>${total} atraso(s)</p>
        </div>
      </div>
      <div class="ranking-right">
        <span class="ranking-badge atraso">${total}</span>
      </div>
    </div>
  `).join("");
}

function renderizarTudo(atividades) {
  atualizarCards(atividades);
  gerarGraficoLinha(atividades);
  gerarGraficoRosca(atividades);
  gerarGraficoPrioridade(atividades);
  gerarGraficoAtrasosUsuarios(atividades);
  gerarRankingProdutividade(atividades);
  gerarRankingAtrasos(atividades);
}

async function carregarIndicadores() {
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

      console.error(dados);
      return;
    }

    atividadesOriginais = dados;
    preencherFiltroCriador(dados);
    renderizarTudo(dados);
  } catch (error) {
    console.error("Erro ao carregar indicadores:", error);
  }
}

carregarIndicadores();
import { API_BASE_URL } from "./config.js";

const token = localStorage.getItem("token");
const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

if (!token) {
  window.location.href = "./index.html";
}

const ehAdmin = usuario?.perfil === "admin";

const boasVindas = document.getElementById("boasVindas");
const menuUsuariosLink = document.getElementById("menuUsuariosLink");
const logoutBtn = document.getElementById("logoutBtn");

const cardPctConcluidas = document.getElementById("cardPctConcluidas");
const cardPctPendentes = document.getElementById("cardPctPendentes");
const cardAtrasadasPct = document.getElementById("cardAtrasadasPct");
const cardPctNoPrazo = document.getElementById("cardPctNoPrazo");

const cardQtdConcluidas = document.getElementById("cardQtdConcluidas");
const cardQtdPendentes = document.getElementById("cardQtdPendentes");
const cardQtdAtrasadas = document.getElementById("cardQtdAtrasadas");
const cardQtdNoPrazo = document.getElementById("cardQtdNoPrazo");

const cardTendenciaConcluidas = document.getElementById("cardTendenciaConcluidas");
const cardTendenciaPrazo = document.getElementById("cardTendenciaPrazo");

const rankingProdutividade = document.getElementById("rankingProdutividade");
const rankingAtrasos = document.getElementById("rankingAtrasos");
const resumoStatusLista = document.getElementById("resumoStatusLista");

const btnLimparFiltros = document.getElementById("btnLimparFiltros");

let atividadesOriginais = [];

let graficoLinha = null;
let graficoRosca = null;
let graficoPrioridade = null;
let graficoAtrasosUsuarios = null;
let graficoSetor = null;

const filtrosSelecionados = {
  statusIndicadores: [],
  prioridadeIndicadores: [],
  criadorIndicadores: [],
  periodoIndicadores: []
};

const dropdownFilters = {
  statusIndicadores: criarControleDropdown("statusIndicadores"),
  prioridadeIndicadores: criarControleDropdown("prioridadeIndicadores"),
  criadorIndicadores: criarControleDropdown("criadorIndicadores"),
  periodoIndicadores: criarControleDropdown("periodoIndicadores")
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

btnLimparFiltros?.addEventListener("click", () => {
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

  renderizarTudo(atividadesOriginais);
});

document.addEventListener("click", (event) => {
  const clicouDentro = event.target.closest("[data-dropdown-root]");
  if (!clicouDentro) {
    fecharTodosDropdowns();
  }
});

function criarControleDropdown(chave) {
  const root = document.querySelector(`[data-dropdown-root="${chave}"]`);
  if (!root) return null;

  const trigger = root.querySelector("[data-dropdown-trigger]");
  const menu = root.querySelector("[data-dropdown-menu]");
  const summary = root.querySelector("[data-dropdown-summary]");
  const optionsWrap = root.querySelector("[data-dropdown-options]");

  if (!trigger || !menu || !summary || !optionsWrap) return null;

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

    filtrosSelecionados[chave] = Array.from(
      optionsWrap.querySelectorAll('input[type="checkbox"]:checked')
    ).map((item) => item.value);

    atualizarResumoDropdown(chave);
    renderizarTudo(aplicarFiltros(atividadesOriginais));
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

  const labelsPadrao = {
    statusIndicadores: "Todos",
    prioridadeIndicadores: "Todas",
    criadorIndicadores: "Todos",
    periodoIndicadores: "Todos"
  };

  if (!selecionados.length) {
    controle.summary.textContent = labelsPadrao[chave] || "Todos";
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

function normalizarTexto(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatarPercentual(valor) {
  return `${valor.toFixed(1)}%`;
}

function obterNomeUsuario(atividade) {
  return (
    atividade?.responsavel?.nome ||
    atividade?.criador?.nome ||
    atividade?.responsavel?.username ||
    atividade?.criador?.username ||
    "Não informado"
  );
}

function obterStatusEfetivo(atividade) {
  const statusOriginal = normalizarTexto(atividade.status);

  if (statusOriginal === "concluida") return "concluida";

  const prazo = obterDataSemHora(atividade.prazo);
  const hoje = obterHojeSemHora();

  if (prazo && prazo < hoje) {
    return "atrasado";
  }

  if (statusOriginal === "em andamento") return "em andamento";
  if (statusOriginal === "pendente") return "pendente";

  return statusOriginal || "pendente";
}

function atividadeEstaConcluida(atividade) {
  return obterStatusEfetivo(atividade) === "concluida";
}

function atividadeEstaAtrasada(atividade) {
  return obterStatusEfetivo(atividade) === "atrasado";
}

function atividadeEstaEmAberto(atividade) {
  const status = obterStatusEfetivo(atividade);
  return status === "pendente" || status === "em andamento";
}

function atividadeNoPrazo(atividade) {
  if (!atividade.prazo) return false;

  const prazo = obterDataSemHora(atividade.prazo);
  if (!prazo) return false;

  if (atividadeEstaConcluida(atividade)) {
    if (!atividade.data_conclusao) return false;

    const conclusao = obterDataSemHora(atividade.data_conclusao);
    return !!conclusao && conclusao <= prazo;
  }

  const hoje = obterHojeSemHora();
  return hoje <= prazo;
}

function obterHojeSemHora() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
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

function quebrarSetores(valor) {
  if (!valor) return [];
  return String(valor)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function popularDropdownsFixos() {
  preencherDropdown("statusIndicadores", [
    "pendente",
    "em andamento",
    "concluída",
    "atrasado"
  ]);

  preencherDropdown("prioridadeIndicadores", [
    "baixa",
    "média",
    "alta",
    "crítica"
  ]);

  preencherDropdown("periodoIndicadores", [
    "Últimos 7 dias",
    "Últimos 30 dias",
    "Últimos 90 dias"
  ]);
}

function preencherFiltroResponsavel(atividades) {
  const nomes = [...new Set(atividades.map(obterNomeUsuario))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  preencherDropdown("criadorIndicadores", nomes);
}

function aplicarFiltros(atividades) {
  const statusSelecionados = (filtrosSelecionados.statusIndicadores || []).map(normalizarTexto);
  const prioridadeSelecionadas = (filtrosSelecionados.prioridadeIndicadores || []).map(normalizarTexto);
  const criadoresSelecionados = filtrosSelecionados.criadorIndicadores || [];
  const periodosSelecionados = filtrosSelecionados.periodoIndicadores || [];

  return atividades.filter((atividade) => {
    const nomeUsuario = obterNomeUsuario(atividade);
    const status = obterStatusEfetivo(atividade);
    const prioridade = normalizarTexto(atividade.prioridade);
    const dataCriacao = atividade.data_criacao ? new Date(atividade.data_criacao) : null;

    const atendeStatus =
      !statusSelecionados.length ||
      statusSelecionados.includes(status === "concluida" ? "concluída" : status);

    const atendePrioridade =
      !prioridadeSelecionadas.length || prioridadeSelecionadas.includes(prioridade);

    const atendeCriador =
      !criadoresSelecionados.length || criadoresSelecionados.includes(nomeUsuario);

    let atendePeriodo = true;

    if (periodosSelecionados.length) {
      if (!dataCriacao || Number.isNaN(dataCriacao.getTime())) {
        atendePeriodo = false;
      } else {
        const hoje = new Date();
        atendePeriodo = periodosSelecionados.some((periodo) => {
          const diffDias = (hoje - dataCriacao) / (1000 * 60 * 60 * 24);

          if (periodo === "Últimos 7 dias") return diffDias <= 7;
          if (periodo === "Últimos 30 dias") return diffDias <= 30;
          if (periodo === "Últimos 90 dias") return diffDias <= 90;

          return true;
        });
      }
    }

    return atendeStatus && atendePrioridade && atendeCriador && atendePeriodo;
  });
}

function atualizarCards(atividades) {
  const total = atividades.length;

  if (!total) {
    cardPctConcluidas.textContent = "0%";
    cardPctPendentes.textContent = "0%";
    cardAtrasadasPct.textContent = "0%";
    cardPctNoPrazo.textContent = "0%";

    cardQtdConcluidas.textContent = "0 atividades concluídas";
    cardQtdPendentes.textContent = "0 atividades em aberto";
    cardQtdAtrasadas.textContent = "0 atividades atrasadas";
    cardQtdNoPrazo.textContent = "0 atividades no prazo";

    cardTendenciaConcluidas.textContent = "-";
    cardTendenciaConcluidas.className = "card-trend";
    cardTendenciaPrazo.textContent = "-";
    cardTendenciaPrazo.className = "card-trend";
    return;
  }

  const concluidas = atividades.filter(atividadeEstaConcluida).length;
  const abertas = atividades.filter(atividadeEstaEmAberto).length;
  const atrasadas = atividades.filter(atividadeEstaAtrasada).length;

  const comPrazo = atividades.filter((atividade) => !!atividade.prazo);
  const noPrazo = comPrazo.filter(atividadeNoPrazo).length;

  const pctConcluidas = (concluidas / total) * 100;
  const pctAbertas = (abertas / total) * 100;
  const pctAtrasadas = (atrasadas / total) * 100;
  const pctNoPrazo = comPrazo.length ? (noPrazo / comPrazo.length) * 100 : 0;

  cardPctConcluidas.textContent = formatarPercentual(pctConcluidas);
  cardPctPendentes.textContent = formatarPercentual(pctAbertas);
  cardAtrasadasPct.textContent = formatarPercentual(pctAtrasadas);
  cardPctNoPrazo.textContent = formatarPercentual(pctNoPrazo);

  cardQtdConcluidas.textContent = `${concluidas} atividade(s) concluída(s)`;
  cardQtdPendentes.textContent = `${abertas} atividade(s) em aberto`;
  cardQtdAtrasadas.textContent = `${atrasadas} atividade(s) atrasada(s)`;
  cardQtdNoPrazo.textContent = `${noPrazo} atividade(s) no prazo`;

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
    if (Number.isNaN(data.getTime())) return;

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
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124, 58, 237, 0.18)",
          borderWidth: 3,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: "#7c3aed"
        }
      ]
    },
    options: opcoesPadraoGrafico()
  });
}

function gerarGraficoRosca(atividades) {
  const concluidas = atividades.filter(atividadeEstaConcluida).length;
  const emAberto = atividades.filter(atividadeEstaEmAberto).length;
  const atrasadas = atividades.filter(atividadeEstaAtrasada).length;

  const ctx = document.getElementById("graficoRosca");

  if (graficoRosca) graficoRosca.destroy();

  graficoRosca = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Concluídas", "Em aberto", "Atrasadas"],
      datasets: [
        {
          data: [concluidas, emAberto, atrasadas],
          backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
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
            padding: 18,
            boxWidth: 12,
            usePointStyle: true,
            pointStyle: "circle"
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
          backgroundColor: ["#22c55e", "#f59e0b", "#fb7185", "#ef4444"],
          borderRadius: 10
        }
      ]
    },
    options: opcoesPadraoGraficoBarra()
  });
}

function gerarGraficoSetor(atividades) {
  const mapa = {};

  atividades.forEach((atividade) => {
    const setores = quebrarSetores(atividade.setor);

    if (!setores.length) {
      mapa["Sem setor"] = (mapa["Sem setor"] || 0) + 1;
      return;
    }

    setores.forEach((setor) => {
      mapa[setor] = (mapa[setor] || 0) + 1;
    });
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const labels = ranking.map(([nome]) => nome);
  const valores = ranking.map(([, total]) => total);

  const ctx = document.getElementById("graficoSetor");

  if (graficoSetor) graficoSetor.destroy();

  graficoSetor = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Atividades",
          data: valores,
          backgroundColor: "#3b82f6",
          borderRadius: 10
        }
      ]
    },
    options: {
      ...opcoesPadraoGraficoBarra(),
      indexAxis: "y"
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
    .slice(0, 6);

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
          backgroundColor: "#ef4444",
          borderRadius: 10
        }
      ]
    },
    options: {
      ...opcoesPadraoGraficoBarra(),
      indexAxis: "y"
    }
  });
}

function renderizarResumoStatus(atividades) {
  if (!resumoStatusLista) return;

  const concluidas = atividades.filter(atividadeEstaConcluida).length;
  const emAberto = atividades.filter(atividadeEstaEmAberto).length;
  const atrasadas = atividades.filter(atividadeEstaAtrasada).length;

  const itens = [
    { label: "Concluídas", valor: concluidas, classe: "verde" },
    { label: "Em aberto", valor: emAberto, classe: "laranja" },
    { label: "Atrasadas", valor: atrasadas, classe: "vermelho" }
  ];

  resumoStatusLista.innerHTML = itens
    .map(
      (item) => `
        <div class="resumo-status-item">
          <div class="resumo-status-left">
            <span class="resumo-status-dot ${item.classe}"></span>
            <strong>${item.label}</strong>
          </div>
          <span class="ranking-badge resumo">${item.valor}</span>
        </div>
      `
    )
    .join("");
}

function renderizarRankingProdutividade(atividades) {
  if (!rankingProdutividade) return;

  const mapa = {};

  atividades.forEach((atividade) => {
    const nome = obterNomeUsuario(atividade);

    if (!mapa[nome]) {
      mapa[nome] = {
        total: 0,
        concluidas: 0,
        abertas: 0,
        atrasadas: 0
      };
    }

    mapa[nome].total += 1;

    if (atividadeEstaConcluida(atividade)) {
      mapa[nome].concluidas += 1;
    } else if (atividadeEstaAtrasada(atividade)) {
      mapa[nome].atrasadas += 1;
    } else {
      mapa[nome].abertas += 1;
    }
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8);

  if (!ranking.length) {
    rankingProdutividade.innerHTML = `<div class="empty-state-bloco">Nenhum dado para exibir.</div>`;
    return;
  }

  rankingProdutividade.innerHTML = ranking
    .map(([nome, dados], index) => {
      const totalSeguro = dados.total || 1;
      const pctConcluidas = (dados.concluidas / totalSeguro) * 100;
      const pctAbertas = (dados.abertas / totalSeguro) * 100;
      const pctAtrasadas = (dados.atrasadas / totalSeguro) * 100;

      const textoConcluidas = pctConcluidas >= 10 ? dados.concluidas : "";
      const textoAbertas = pctAbertas >= 10 ? dados.abertas : "";
      const textoAtrasadas = pctAtrasadas >= 10 ? dados.atrasadas : "";

      return `
        <div class="ranking-item ranking-item-prod">
          <div class="ranking-left">
            <div class="ranking-posicao">${index + 1}</div>
            <div class="ranking-info">
              <strong>${escaparHtml(nome)}</strong>
              <p>${dados.total} atividade(s)</p>
            </div>
          </div>

          <div class="ranking-stack-area">
            <div class="ranking-mini-stack" title="Verde: concluídas | Laranja: em aberto | Vermelho: atrasadas">
              <span class="stack-segment verde" style="width:${pctConcluidas}%">
                ${textoConcluidas ? `<span class="stack-value">${textoConcluidas}</span>` : ""}
              </span>
              <span class="stack-segment laranja" style="width:${pctAbertas}%">
                ${textoAbertas ? `<span class="stack-value">${textoAbertas}</span>` : ""}
              </span>
              <span class="stack-segment vermelho" style="width:${pctAtrasadas}%">
                ${textoAtrasadas ? `<span class="stack-value">${textoAtrasadas}</span>` : ""}
              </span>
            </div>
          </div>

          <div class="ranking-badge">${dados.total}</div>
        </div>
      `;
    })
    .join("");
}

function renderizarRankingAtrasos(atividades) {
  if (!rankingAtrasos) return;

  const mapa = {};

  atividades.forEach((atividade) => {
    if (!atividadeEstaAtrasada(atividade)) return;

    const nome = obterNomeUsuario(atividade);
    mapa[nome] = (mapa[nome] || 0) + 1;
  });

  const ranking = Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!ranking.length) {
    rankingAtrasos.innerHTML = `<div class="empty-state-bloco">Nenhum atraso encontrado.</div>`;
    return;
  }

  rankingAtrasos.innerHTML = ranking
    .map(
      ([nome, total], index) => `
        <div class="ranking-item">
          <div class="ranking-left">
            <div class="ranking-posicao atraso">${index + 1}</div>
            <div>
              <strong>${escaparHtml(nome)}</strong>
              <p>${total} atividade(s) atrasada(s)</p>
            </div>
          </div>
          <div class="ranking-badge atraso">${total}</div>
        </div>
      `
    )
    .join("");
}

function opcoesPadraoGrafico() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e5e7eb"
        }
      }
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
  };
}

function opcoesPadraoGraficoBarra() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#e5e7eb"
        }
      }
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
  };
}

function renderizarTudo(atividades) {
  atualizarCards(atividades);
  gerarGraficoLinha(atividades);
  gerarGraficoRosca(atividades);
  gerarGraficoPrioridade(atividades);
  gerarGraficoSetor(atividades);
  gerarGraficoAtrasosUsuarios(atividades);
  renderizarResumoStatus(atividades);
  renderizarRankingProdutividade(atividades);
  renderizarRankingAtrasos(atividades);
}

async function carregarAtividades() {
  try {
    const resposta = await fetch(`${API_BASE_URL}/atividades`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      rankingProdutividade.innerHTML = `<div class="empty-state-bloco">${escaparHtml(dados.erro || "Erro ao carregar atividades.")}</div>`;
      rankingAtrasos.innerHTML = `<div class="empty-state-bloco">${escaparHtml(dados.erro || "Erro ao carregar atividades.")}</div>`;
      resumoStatusLista.innerHTML = `<div class="empty-state-bloco">${escaparHtml(dados.erro || "Erro ao carregar atividades.")}</div>`;
      return;
    }

    atividadesOriginais = Array.isArray(dados) ? dados : [];

    popularDropdownsFixos();
    preencherFiltroResponsavel(atividadesOriginais);

    renderizarTudo(atividadesOriginais);
  } catch (error) {
    rankingProdutividade.innerHTML = `<div class="empty-state-bloco">Erro ao conectar com o servidor.</div>`;
    rankingAtrasos.innerHTML = `<div class="empty-state-bloco">Erro ao conectar com o servidor.</div>`;
    resumoStatusLista.innerHTML = `<div class="empty-state-bloco">Erro ao conectar com o servidor.</div>`;
  }
}

carregarAtividades();
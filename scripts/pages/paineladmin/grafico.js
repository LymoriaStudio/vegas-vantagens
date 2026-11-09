import {estabelecimentosCache} from './estabelecimentos.js'
import {cuponsCache} from './cupomPainel.js'

let graficoPizzaEstab = null;

function processarDadosGrafico(tipo) {
  if (!estabelecimentosCache || estabelecimentosCache.length === 0) {
    console.warn('❌ estabelecimentosCache vazio ou não existe');
    return {};
  }

  const dados = {};

  // 🔥 usa cuponsCache global
  const cuponsAtivos = (cuponsCache || []).filter(
    c => c.status === "Publicado"
  );

  estabelecimentosCache.forEach(estab => {
    let chave;

    switch (tipo) {
      case 'cidade':
        chave = estab.cidade || 'Sem Cidade';
        break;

      case 'categoria':
        if (estab.categorias && estab.categorias.length > 0) {
          estab.categorias.forEach(cat => {
            const categoria = cat || 'Sem Categoria';
            dados[categoria] = (dados[categoria] || 0) + 1;
          });
          return;
        } else {
          chave = 'Sem Categoria';
        }
        break;

      case 'cupons':
        // 🔥 contar cupons por estabelecimento usando cache global
       const qtdCupons = cuponsAtivos.filter(
  c => c.nomeEstabelecimento === estab.nome
).length;

        if (qtdCupons === 0) chave = 'Sem cupons';
        else if (qtdCupons <= 5) chave = '1-5 cupons';
        else if (qtdCupons <= 10) chave = '6-10 cupons';
        else if (qtdCupons <= 20) chave = '11-20 cupons';
        else chave = '20+ cupons';
        break;

      case 'bairro':
        chave = estab.bairro || 'Sem Bairro';
        break;

      case 'status':
        chave = estab.status || 'Sem Status';
        break;
    }

    dados[chave] = (dados[chave] || 0) + 1;
  });

  return dados;
}

// Gerar paleta de cores para o gráfico
function gerarPaletaCores(quantidade) {
  const cores = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#E74C3C', '#3498DB', '#2ECC71', '#F39C12',
    '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085'
  ];
  
  // Se precisar de mais cores, gerar aleatórias
  while (cores.length < quantidade) {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    cores.push(`rgb(${r}, ${g}, ${b})`);
  }
  
  return cores.slice(0, quantidade);
}

// Renderizar gráfico de pizza
function renderizarGraficoPizza() {
  // Verificar se elementos existem
  const ctx = document.getElementById('graficoEstabelecimentos');
  if (!ctx) {
    console.error('Canvas do gráfico não encontrado');
    return;
  }

  if (!estabelecimentosCache || estabelecimentosCache.length === 0) {
    ctx.parentElement.innerHTML = '<div class="no-data">Nenhum estabelecimento encontrado</div>';
    return;
  }

  const tipo = document.getElementById('filtroTipo')?.value || 'cidade';



  const dadosProcessados = processarDadosGrafico(tipo);
  
  // Verificar se há dados
  if (Object.keys(dadosProcessados).length === 0) {
    ctx.parentElement.innerHTML = '<div class="no-data">Nenhum dado disponível para este filtro</div>';
    return;
  }

  // Converter para array e ordenar
  let dadosArray = Object.entries(dadosProcessados).map(([label, value]) => ({
    label,
    value
  }));

  

  const labels = dadosArray.map(d => d.label);
  const valores = dadosArray.map(d => d.value);
  const cores = gerarPaletaCores(labels.length);

  // Destruir gráfico anterior se existir
  if (graficoPizzaEstab) {
    graficoPizzaEstab.destroy();
  }

  // Criar novo gráfico
  graficoPizzaEstab = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: cores,
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            padding: 15,
            font: {
              size: 13
            },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
      animation: {
        animateRotate: true,
        animateScale: true
      }
    }
  });
}

// Atualizar cards de estatísticas gerais
function renderizarCardsEstatisticas() {
  const statsContainer = document.getElementById('statsGrid');
  if (!statsContainer) {
    console.error('Container de estatísticas não encontrado');
    return;
  }

  if (!estabelecimentosCache || estabelecimentosCache.length === 0) {
    statsContainer.innerHTML = '<div class="no-data">Nenhum dado disponível</div>';
    return;
  }

  const totalEstab = estabelecimentosCache.length;
  
  // Cupons podem não existir em todos os estabelecimentos
 const totalCupons = Array.isArray(cuponsCache)
  ? cuponsCache.filter(c => c.status === "Publicado").length
  : 0;
  
  // Cidades únicas
  const totalCidades = new Set(
    estabelecimentosCache
      .map(e => e.cidade)
      .filter(Boolean)
  ).size;
  
  // Categorias únicas (flat das arrays de categorias)
  const todasCategorias = estabelecimentosCache
    .flatMap(e => e.categorias || [])
    .filter(Boolean);
  const totalCategorias = new Set(todasCategorias).size;

  const statsHTML = `
    <div class="stat-card">
      <h3>Total de Estabelecimentos</h3>
      <div class="value">${totalEstab}</div>
    </div>
    <div class="stat-card">
      <h3>Cupons Ativos</h3>
      <div class="value">${totalCupons}</div>
    </div>
    <div class="stat-card">
      <h3>Cidades</h3>
      <div class="value">${totalCidades}</div>
    </div>
    <div class="stat-card">
      <h3>Categorias</h3>
      <div class="value">${totalCategorias}</div>
    </div>
  `;

  statsContainer.innerHTML = statsHTML;
}

// Configurar eventos dos filtros do dashboard
function inicializarFiltrosGrafico() {
  const filtroTipo = document.getElementById('filtroTipo');



  if (filtroTipo) {
    filtroTipo.addEventListener('change', renderizarGraficoPizza);
  }




}

// Inicializar todo o dashboard de gráficos
export function inicializarDashboardGraficos() {
  console.log('📊 Inicializando dashboard...', {
    totalEstabelecimentos: estabelecimentosCache?.length || 0
  });

  if (!estabelecimentosCache || estabelecimentosCache.length === 0) {
    const chartWrapper = document.querySelector('.chart-wrapper');
    if (chartWrapper) {
      chartWrapper.innerHTML = '<div class="no-data">Nenhum estabelecimento encontrado</div>';
    }
    
    const statsContainer = document.getElementById('statsGrid');
    if (statsContainer) {
      statsContainer.innerHTML = '<div class="no-data">Nenhum dado disponível</div>';
    }
    return;
  }

  renderizarCardsEstatisticas();
  inicializarFiltrosGrafico();
  renderizarGraficoPizza();
}

// Atualizar dashboard completo (chamado após mudanças nos dados)
function atualizarDashboardCompleto() {
  if (!estabelecimentosCache || estabelecimentosCache.length === 0) {
    console.warn('⚠️ Tentando atualizar dashboard sem dados');
    return;
  }
  
  renderizarCardsEstatisticas();
  renderizarGraficoPizza();
}

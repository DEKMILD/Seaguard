let sstChartInstance = null;
let dhwChartInstance = null;

// ----------------------------------------------------
// 1. ฟังก์ชันวาดกราฟคู่ (รับข้อมูล Array รายวันเข้ามาวาด)
// ----------------------------------------------------
function renderDualCharts(dates, sstValues, dhwValues) {
  // --- 1.1 วาด SST Chart (ฝั่งซ้าย) ---
  const canvasSST = document.getElementById('sstForecastChart');
  if (canvasSST) {
    const ctxSST = canvasSST.getContext('2d');
    const existingSST = Chart.getChart(canvasSST);
    if (existingSST && existingSST !== sstChartInstance) existingSST.destroy();
    if (sstChartInstance) sstChartInstance.destroy();

    sstChartInstance = new Chart(ctxSST, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: window.SeaGuardI18n?.getLanguage() === 'th' ? 'แนวโน้ม SST' : 'SST Forecast',
          data: sstValues,
          borderColor: '#22d3ee',
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#22d3ee',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
      }
    });
  }

  // --- 1.2 วาด DHW Chart (ฝั่งขวา) ---
  const canvasDHW = document.getElementById('dhwForecastChart');
  if (canvasDHW) {
    const ctxDHW = canvasDHW.getContext('2d');
    const existingDHW = Chart.getChart(canvasDHW);
    if (existingDHW && existingDHW !== dhwChartInstance) existingDHW.destroy();
    if (dhwChartInstance) dhwChartInstance.destroy();

    const gradient = ctxDHW.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    dhwChartInstance = new Chart(ctxDHW, {
      type: 'line',
      data: {
        labels: dates,
        datasets: [{
          label: window.SeaGuardI18n?.getLanguage() === 'th' ? 'แนวโน้ม DHW' : 'DHW Forecast',
          data: dhwValues,
          borderColor: '#f59e0b',
          backgroundColor: gradient,
          fill: true,
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#f59e0b',
          pointBorderWidth: 2,
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
        }
      }
    });
  }
}

function clearDualCharts() {
  if (typeof Chart === 'undefined') return;
  for (const id of ['sstForecastChart', 'dhwForecastChart']) {
    const canvas = document.getElementById(id);
    const chart = canvas && Chart.getChart(canvas);
    if (chart) {
      chart.data.labels = [];
      for (const dataset of chart.data.datasets) dataset.data = [];
      chart.update();
    }
  }
}

document.addEventListener('seaguard:languagechange', (event) => {
  const thai = event.detail.language === 'th';
  for (const [chart, label] of [[sstChartInstance, thai ? 'แนวโน้ม SST' : 'SST Forecast'],
                                 [dhwChartInstance, thai ? 'แนวโน้ม DHW' : 'DHW Forecast']]) {
    if (chart?.data.datasets[0]) {
      chart.data.datasets[0].label = label;
      chart.update();
    }
  }
});



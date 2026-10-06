// script.js

let sstChartInstance = null;
let dhwChartInstance = null;

// ฟังก์ชันวาดกราฟคู่ (SST & DHW Forecast)
function renderDualCharts(dates, sstValues, dhwValues) {
  const defaultDates = dates || ['28 ก.ย.', '29 ก.ย.', '30 ก.ย.', '1 ต.ค.', '2 ต.ค.', '3 ต.ค.', '4 ต.ค.'];
  const defaultSST = sstValues || [29.08, 29.10, 29.16, 29.22, 29.19, 29.18, 29.19];
  const defaultDHW = dhwValues || [0.031, 0.000, 0.015, 0.000, 0.000, 0.000, 0.003];

  // --- 1. กราฟ SST Forecast (ฝั่งซ้าย) ---
  const canvasSST = document.getElementById('sstForecastChart');
  if (canvasSST) {
    const ctxSST = canvasSST.getContext('2d');
    if (sstChartInstance) sstChartInstance.destroy(); // ลบกราฟเก่าก่อนวาดใหม่

    sstChartInstance = new Chart(ctxSST, {
      type: 'line',
      data: {
        labels: defaultDates,
        datasets: [{
          data: defaultSST,
          borderColor: '#22d3ee', // สีฟ้า Neon
          borderWidth: 3,
          tension: 0.4,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#22d3ee',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }


  // --- 2. กราฟ DHW Forecast (ฝั่งขวา) ---
  const canvasDHW = document.getElementById('dhwForecastChart');
  if (canvasDHW) {
    const ctxDHW = canvasDHW.getContext('2d');
    if (dhwChartInstance) dhwChartInstance.destroy();

    const gradient = ctxDHW.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    dhwChartInstance = new Chart(ctxDHW, {
      type: 'line',
      data: {
        labels: defaultDates,
        datasets: [{
          data: defaultDHW,
          borderColor: '#f59e0b', // สีส้ม Amber
          backgroundColor: gradient,
          fill: true,
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: '#f59e0b',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }
}

// วาดกราฟอัตโนมัติทันทีเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", () => {
  renderDualCharts();
});

/* ==========================================================================
   Interactive Reef Recovery Chart Canvas (แก้ไขจุดเสี่ยงแล้ว)
   ========================================================================== */
const recoveryCanvas = document.getElementById('recoveryChart');

// 🟢 ปรับให้ประกาศฟังก์ชันลง window ไว้ล่วงหน้า ป้องกัน ReferenceError จาก HTML Inline onclick
window.currentForecastMode = 'assisted';
window.updateForecast = function (mode) {
  window.currentForecastMode = mode;
  const btnN = document.getElementById('btnNatural');
  const btnA = document.getElementById('btnAssisted');

  if (mode === 'assisted') {
    if (btnA) btnA.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 transition-all";
    if (btnN) btnN.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-slate-300 hover:bg-white/20 transition-all";
  } else {
    if (btnN) btnN.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 transition-all";
    if (btnA) btnA.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-slate-300 hover:bg-white/20 transition-all";
  }
  if (typeof window.drawRecoveryChart === 'function') {
    window.drawRecoveryChart();
  }
};

if (recoveryCanvas) {
  const rCtx = recoveryCanvas.getContext('2d');

  window.drawRecoveryChart = function () {
    if (!recoveryCanvas.parentElement) return;
    const w = recoveryCanvas.width = recoveryCanvas.parentElement.clientWidth;
    const h = recoveryCanvas.height = recoveryCanvas.parentElement.clientHeight;

    // 🟢 แก้ไข: ป้องกัน Infinite Loop เมื่อ Container มีขนาดเป็น 0
    if (w <= 0 || h <= 0) return;

    rCtx.clearRect(0, 0, w, h);

    rCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    rCtx.lineWidth = 1;
    for (let y = 0; y <= h; y += h / 4) {
      rCtx.beginPath();
      rCtx.moveTo(0, y);
      rCtx.lineTo(w, y);
      rCtx.stroke();
    }

    const months = ['M1', 'M3', 'M6', 'M9', 'M12'];
    const naturalData = [18, 20, 22, 23, 25];
    const assistedData = [18, 35, 58, 74, 88];

    const activeData = window.currentForecastMode === 'assisted' ? assistedData : naturalData;
    const lineColor = window.currentForecastMode === 'assisted' ? '#00f2fe' : '#f59e0b';

    const stepX = w / (months.length - 1);
    const points = activeData.map((val, i) => ({
      x: i * stepX,
      y: h - (val / 100) * (h - 40) - 20,
      val,
    }));

    rCtx.beginPath();
    points.forEach(({ x, y }, i) => {
      if (i === 0) rCtx.moveTo(x, y);
      else rCtx.lineTo(x, y);
    });

    rCtx.strokeStyle = lineColor;
    rCtx.lineWidth = 3;
    rCtx.stroke();

    rCtx.lineTo(points[points.length - 1].x, h);
    rCtx.lineTo(0, h);
    rCtx.closePath();
    const gradient = rCtx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, window.currentForecastMode === 'assisted' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(245, 158, 11, 0.25)');
    gradient.addColorStop(1, 'transparent');
    rCtx.fillStyle = gradient;
    rCtx.fill();

    points.forEach(({ x, y, val }) => {
      rCtx.beginPath();
      rCtx.arc(x, y, 5, 0, Math.PI * 2);
      rCtx.fillStyle = '#ffffff';
      rCtx.fill();
      rCtx.strokeStyle = lineColor;
      rCtx.lineWidth = 2;
      rCtx.stroke();

      rCtx.fillStyle = '#94a3b8';
      rCtx.font = '11px Inter, sans-serif';
      rCtx.fillText(`${val}%`, x - 10, y - 10);
    });
  };

  window.addEventListener('resize', window.drawRecoveryChart);
  setTimeout(window.drawRecoveryChart, 200);
}

/* ==========================================================================
   Mobile Navigation Toggle
   ========================================================================== */
(function setupMobileNav() {
  const toggle = document.getElementById('mobileNavToggle');
  const panel = document.getElementById('mobileNavPanel');
  const icon = document.getElementById('mobileNavIcon');
  if (!toggle || !panel || !icon) return;

  function setOpen(open) {
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('max-h-0', !open);
    panel.classList.toggle('max-h-96', open);
    icon.className = open ? 'fa-solid fa-xmark text-lg' : 'fa-solid fa-bars text-lg';
  }

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  panel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
})();

/* ==========================================================================
   Hero Image Fallback
   ========================================================================== */
window.renderHeroFallbackSVG = function (imgEl) {
  const container = imgEl.parentElement;
  if (!container) return;
  container.innerHTML = `
    <div class="flex flex-col items-center gap-3 text-center">
      <svg width="120" height="120" viewBox="0 0 64 64" fill="none" aria-hidden="true" class="text-cyan-400 animate-float">
        <ellipse cx="32" cy="46" rx="22" ry="8" fill="currentColor" opacity="0.15" />
        <path d="M32 10c-2 6-4 9-9 12 4 0 7 1 9 3 2-2 5-3 9-3-5-3-7-6-9-12z" fill="currentColor" opacity="0.9" />
        <path d="M32 22v10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <path d="M12 40c4-3 8-3 12 0s8 3 12 0 8-3 12 0" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" />
      </svg>
      <span class="text-sm text-slate-300 font-medium">Koh Mun Nai Marine Sanctuary</span>
    </div>
  `;
};

/* ==========================================================================
   Coral Bleaching Simulator (Temperature Slider)
   ========================================================================== */
const BLEACH_TEMP_MIN = 26;
const BLEACH_TEMP_MAX = 34;
const BLEACH_TEMP_STRESS_THRESHOLD = 29.5;

// ponytail: two-segment linear heuristic anchored to the slider's own printed
// thresholds (26 optimal / 29.5 stress / 34 severe), not a real
// degree-heating-weeks model. Swap for a real model if scientific accuracy matters.
function getBleachPercent(tempC) {
  const t = Math.min(BLEACH_TEMP_MAX, Math.max(BLEACH_TEMP_MIN, tempC));
  if (t <= BLEACH_TEMP_STRESS_THRESHOLD) {
    return ((t - BLEACH_TEMP_MIN) / (BLEACH_TEMP_STRESS_THRESHOLD - BLEACH_TEMP_MIN)) * 30;
  }
  return 30 + ((t - BLEACH_TEMP_STRESS_THRESHOLD) / (BLEACH_TEMP_MAX - BLEACH_TEMP_STRESS_THRESHOLD)) * 70;
}

console.assert(getBleachPercent(BLEACH_TEMP_MIN) === 0, 'getBleachPercent: expected 0% at optimal temp');
console.assert(getBleachPercent(BLEACH_TEMP_MAX) === 100, 'getBleachPercent: expected 100% at severe temp');
console.assert(getBleachPercent(BLEACH_TEMP_STRESS_THRESHOLD) === 30, 'getBleachPercent: expected 30% at stress threshold');

function lerpColor(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}

// Matches the slider track gradient in style.css (input[type=range]::-webkit-slider-runnable-track)
const SLIDER_GRADIENT_STOPS = [
  { stop: 0, color: '#19b626' },
  { stop: 0.35, color: '#e7e32c' },
  { stop: 0.7, color: '#f59e0b' },
  { stop: 1, color: '#ef4444' },
];

function getSliderColor(t) {
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 0; i < SLIDER_GRADIENT_STOPS.length - 1; i++) {
    const a = SLIDER_GRADIENT_STOPS[i];
    const b = SLIDER_GRADIENT_STOPS[i + 1];
    if (clamped <= b.stop) {
      return lerpColor(a.color, b.color, (clamped - a.stop) / (b.stop - a.stop));
    }
  }
  return SLIDER_GRADIENT_STOPS[SLIDER_GRADIENT_STOPS.length - 1].color;
}

function getBleachTier(percent) {
  if (percent < 15) {
    return {
      meterLabel: `Healthy (${Math.round(percent)}%)`,
      meterColorClass: 'text-emerald-400',
      badgeText: 'STATUS: Healthy Reef',
      badgeColorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      impactText: (t) => `At ${t.toFixed(1)}°C, coral polyps hold their symbiotic algae with no measurable stress.`,
    };
  }
  if (percent < 40) {
    return {
      meterLabel: `Moderate (${Math.round(percent)}%)`,
      meterColorClass: 'text-amber-400',
      badgeText: 'STATUS: Moderate Bleaching Risk',
      badgeColorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      impactText: (t) => `At ${t.toFixed(1)}°C, coral polyps show early stress signaling — some algae expulsion begins.`,
    };
  }
  if (percent < 70) {
    return {
      meterLabel: `Severe (${Math.round(percent)}%)`,
      meterColorClass: 'text-orange-400',
      badgeText: 'STATUS: High Bleaching Risk',
      badgeColorClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      impactText: (t) => `At ${t.toFixed(1)}°C, coral polyp stress is significant. Sustained heat is driving rapid algae loss.`,
    };
  }
  return {
    meterLabel: `Critical (${Math.round(percent)}%)`,
    meterColorClass: 'text-red-400',
    badgeText: 'STATUS: Critical Bleaching Event',
    badgeColorClass: 'bg-red-500/20 text-red-300 border-red-500/40',
    impactText: (t) => `At ${t.toFixed(1)}°C, coral polyp stress is extreme. Thermal breakdown causes near-total loss of photosynthetic algae.`,
  };
}

const METER_COLOR_CLASSES = ['text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-red-400'];
const BADGE_COLOR_CLASSES = [
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  'bg-amber-500/20 text-amber-300 border-amber-500/40',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-red-500/20 text-red-300 border-red-500/40',
];

(function setupBleachingSimulator() {
  const slider = document.getElementById('tempSlider');
  const tempDisplay = document.getElementById('tempDisplay');
  const meterText = document.getElementById('bleachMeterText');
  const meterBar = document.getElementById('bleachMeterBar');
  const statusBadge = document.getElementById('coralStatusBadge');
  const impactText = document.getElementById('coralImpactText');
  const coralBranches = [
    document.getElementById('coralBranch1'),
    document.getElementById('coralBranch2'),
    document.getElementById('coralBranch3'),
  ];
  if (!slider || !tempDisplay || !meterText || !meterBar || !statusBadge || !impactText) return;

  function update() {
    const temp = Number(slider.value);
    const percent = getBleachPercent(temp);
    const tier = getBleachTier(percent);
    const sliderT = (temp - BLEACH_TEMP_MIN) / (BLEACH_TEMP_MAX - BLEACH_TEMP_MIN);
    const coralColor = getSliderColor(sliderT);

    tempDisplay.textContent = `${temp.toFixed(1)}°C`;

    meterText.textContent = tier.meterLabel;
    meterText.classList.remove(...METER_COLOR_CLASSES);
    meterText.classList.add(tier.meterColorClass);
    meterBar.style.width = `${percent}%`;

    statusBadge.textContent = tier.badgeText;
    statusBadge.classList.remove(...BADGE_COLOR_CLASSES.flatMap((c) => c.split(' ')));
    statusBadge.classList.add(...tier.badgeColorClass.split(' '));

    coralBranches.forEach((branch) => {
      if (branch) branch.setAttribute('fill', coralColor);
    });

    impactText.textContent = tier.impactText(temp);
  }

  slider.addEventListener('input', update);
  update();
})();
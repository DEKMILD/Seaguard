(function setupRiskPanel() {
  const root = document.getElementById('ai-risk-root');
  const island = document.body.dataset.island;
  if (!root || !island) return;

  root.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="p-6 rounded-3xl bg-[#09151e] border border-cyan-900/40 text-slate-200 space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 class="text-xl sm:text-2xl font-bold text-white">AI Risk Score (7 วัน)</h2>
            <p class="text-xs text-slate-400 mt-1">คะแนนว่า DHW อีก 7 วันจะถึง 4 หรือไม่ · ไม่ใช่เปอร์เซ็นต์</p>
          </div>
          <button id="risk-refresh" class="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 font-bold text-xs">รีเฟรช</button>
        </div>

        <div id="risk-offline" class="hidden p-3 rounded-xl border border-red-500/50 bg-red-950/40 text-red-200 font-bold">OFFLINE — โหลดโมเดล AI หรือ API ไม่ได้</div>
        <div id="risk-stale" class="hidden p-3 rounded-xl border border-amber-500/50 bg-amber-950/30 text-amber-200 text-sm"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20">
            <p class="text-xs uppercase tracking-wider text-cyan-300">AI</p>
            <div class="flex items-end gap-3 mt-2">
              <span id="risk-score" class="text-4xl font-black text-white">--</span>
              <span id="risk-level" class="px-2 py-1 rounded-lg text-sm font-bold bg-slate-800">--</span>
            </div>
          </div>
          <div class="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20">
            <p class="text-xs uppercase tracking-wider text-amber-300">กฎ DHW · สูตร</p>
            <p id="rule-result" class="text-2xl font-black text-white mt-2">--</p>
            <p id="rule-detail" class="text-xs text-slate-400 mt-2">DHW ≥ 3 และกำลังเพิ่มขึ้น</p>
            <p id="risk-noaa" class="text-xs text-slate-300 mt-3">NOAA ปัจจุบัน: --</p>
          </div>
        </div>

        <p id="risk-data-date" class="text-sm text-slate-300">ข้อมูลล่าสุด: --</p>
        <details id="risk-time-machine" class="p-4 rounded-2xl border border-white/10 bg-slate-950/50">
          <summary class="cursor-pointer text-sm font-bold text-white">Time Machine · ดูผลย้อนหลัง</summary>
          <div class="mt-3 space-y-3">
            <label for="risk-date" class="block text-sm text-slate-300">เลือกวันที่ประเมิน</label>
            <input id="risk-date" type="date" class="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-white">
            <p id="risk-actual" class="hidden text-sm text-slate-200"></p>
          </div>
        </details>
      </div>
    </div>`;

  const byId = (id) => document.getElementById(id);
  function showOffline(error) {
    console.error('AI risk API unavailable', error);
    byId('risk-offline').classList.remove('hidden');
    byId('risk-stale').classList.add('hidden');
    byId('risk-score').textContent = '--';
    byId('risk-level').textContent = 'OFFLINE';
    byId('rule-result').textContent = 'OFFLINE';
    byId('rule-detail').textContent = 'ไม่มีผลจาก API';
    byId('risk-noaa').textContent = 'NOAA ปัจจุบัน: --';
    byId('risk-actual').textContent = '';
    byId('risk-actual').classList.add('hidden');
    byId('risk-data-date').textContent = 'ข้อมูลล่าสุด: --';
  }

  function render(data) {
    byId('risk-offline').classList.add('hidden');
    byId('risk-score').textContent = Number(data.ai_risk_score).toFixed(4);
    byId('risk-level').textContent = data.risk_level_th;
    byId('risk-level').className = `px-2 py-1 rounded-lg text-sm font-bold ${data.risk_level === 'high' ? 'bg-red-500/25 text-red-200' : 'bg-emerald-500/25 text-emerald-200'}`;
    byId('rule-result').textContent = data.baseline_rule.alert ? 'เตือน' : 'ไม่เตือน';
    byId('rule-detail').textContent = `DHW วันนี้ ${Number(data.baseline_rule.dhw_now).toFixed(2)} · 7 วันก่อน ${Number(data.baseline_rule.dhw_7d_ago).toFixed(2)}`;
    byId('risk-noaa').textContent = `NOAA ปัจจุบัน: ${data.noaa_current.level_th} (DHW ${Number(data.noaa_current.dhw).toFixed(2)})`;
    byId('risk-data-date').textContent = `ข้อมูลล่าสุด: ${data.latest_data_date}`;

    const dateInput = byId('risk-date');
    dateInput.min = data.earliest_as_of;
    dateInput.max = data.latest_data_date;
    dateInput.value = data.as_of;

    const actual = data.actual_t_plus_7;
    const historical = data.as_of !== data.latest_data_date;
    const actualText = byId('risk-actual');
    actualText.textContent = actual.available
      ? `ผลจริง ${actual.date}: DHW ${Number(actual.dhw).toFixed(2)} · ${actual.reached_dhw_4 ? 'ถึงเกณฑ์ 4' : 'ไม่ถึงเกณฑ์ 4'}`
      : historical ? 'ยังไม่มีผลจริงของวันที่ +7' : '';
    actualText.classList.toggle('hidden', !actualText.textContent);
    if (historical) byId('risk-time-machine').open = true;

    const stale = byId('risk-stale');
    if (data.stale) {
      stale.textContent = `ข้อมูลย้อนหลัง ${data.data_age_days} วัน · ไม่ใช่สถานะปัจจุบัน`;
      stale.classList.remove('hidden');
    } else {
      stale.classList.add('hidden');
    }
  }

  async function loadRisk(asOf) {
    try {
      const query = new URLSearchParams({ island });
      if (asOf) query.set('as_of', asOf);
      const response = await fetch(`/risk?${query}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.detail || `Risk API status ${response.status}`);
      }
      render(await response.json());
    } catch (error) {
      showOffline(error);
    }
  }

  byId('risk-refresh').addEventListener('click', () => loadRisk(byId('risk-date').value));
  byId('risk-date').addEventListener('change', (event) => loadRisk(event.target.value));
  loadRisk();
})();

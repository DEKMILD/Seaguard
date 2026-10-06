(function () {
  'use strict';

  const STORAGE_KEY = 'seaguard-language';
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  const pairs = [
    // Home page
    ['SeaGuard — จากข้อมูลทะเลสู่การตัดสินใจภาคสนาม', 'SeaGuard — Coral Risk Monitoring'],
    ['SeaGuard ช่วยทีมดูแลทะเลจัดลำดับพื้นที่เฝ้าระวังความเครียดจากความร้อนของปะการัง', 'SeaGuard helps marine teams prioritize coral heat-stress monitoring areas.'],
    ['SeaGuard — Koh Mun Nai Forecast', 'SeaGuard — แนวโน้มเกาะมันใน'],
    ['SeaGuard — Phi Phi Islands Forecast', 'SeaGuard — แนวโน้มหมู่เกาะพีพี'],
    ['Coral Monitoring', 'ติดตามปะการัง'],
    ['SeaGuard หน้าแรก', 'SeaGuard home'],
    ['เมนูหลัก', 'Main navigation'],
    ['ภาษา', 'Language'],
    ['ภาพรวมระบบ', 'System overview'],
    ['ขอบเขตผล AI', 'AI horizon'],
    ['สถานะระบบ', 'System status'],
    ['ดูผลรายเกาะ', 'View island results'],
    ['ติดตามความเสี่ยง', 'Track'],
    ['ปะการังฟอกขาว', 'Coral bleaching risk'],
    ['เลือกเกาะเพื่อดูสถานะ DHW คะแนน AI สำหรับอีก 7 วัน และผลย้อนหลัง', 'Choose an island to see DHW status, the 7-day AI risk score, and historical results.'],
    ['คะแนน AI ไม่ใช่เปอร์เซ็นต์โอกาสฟอกขาว และไม่ใช่ผลยืนยันภาคสนาม', 'The AI score is not a bleaching probability or a field-confirmed observation.'],
    ['พื้นที่ติดตาม', 'Monitoring areas'],
    ['เลือกเกาะเพื่อดูผล', 'Choose an island to view results'],
    ['แสดงวันที่ข้อมูลจริง และแจ้งเตือนเมื่อข้อมูลเก่ากว่า 14 วัน', 'Shows the latest data date and warns when data is over 14 days old.'],
    ['01 / อ่าวไทย', '01 / Gulf of Thailand'],
    ['02 / ทะเลอันดามัน', '02 / Andaman Sea'],
    ['เกาะมันใน', 'Koh Mun Nai'],
    ['เกาะพีพี', 'Phi Phi Islands'],
    ['ระยอง', 'Rayong'],
    ['กระบี่', 'Krabi'],
    ['กำลังตรวจวันที่ข้อมูล…', 'Checking data date…'],
    ['เปิด AI Risk Score และ Time Machine', 'Open AI Risk Score and Time Machine'],
    ['กำลังตรวจสถานะระบบ…', 'Checking system status…'],
    ['ระบบพร้อม', 'System ready'],
    ['AI ไม่พร้อม', 'AI unavailable'],
    ['OFFLINE · ตรวจวันที่ข้อมูลไม่ได้', 'OFFLINE · cannot check data date'],
    ['เชื่อมต่อไม่ได้', 'Connection unavailable'],
    ['SeaGuard · ติดตามความเสี่ยงปะการังฟอกขาว', 'SeaGuard · Coral bleaching risk monitoring'],
    ['AI เฝ้าระวังปะการัง', 'AI Coral Monitoring'],
    ['ดูพื้นที่ติดตาม', 'Explore Locations'],
    ['ระบบทำงานอย่างไร', 'How It Works'],
    ['2 เกาะ', '2 Islands'],
    ['7 วัน', '7 Days'],
    ['แผนที่ประเทศไทยแสดงตำแหน่งเกาะมันในและเกาะพีพี', 'Map of Thailand showing Koh Mun Nai and Phi Phi Islands'],
    ['พื้นที่ติดตาม: เกาะมันในและเกาะพีพี', 'Monitoring areas: Koh Mun Nai and Phi Phi Islands'],
    ['เลือกพื้นที่เพื่อดูผลการประเมินแยกตามเกาะ', 'Choose an area to view results for each island.'],
    ['จังหวัดระยอง', 'Rayong Province'],
    ['จังหวัดกระบี่', 'Krabi Province'],
    ['พื้นที่ติดตามแนวปะการังอ่าวไทย ดูสถานะ DHW และคะแนน AI ล่วงหน้า 7 วัน', 'Gulf of Thailand coral reef monitoring area. View DHW status and the 7-day AI risk score.'],
    ['พื้นที่ติดตามระบบนิเวศทะเลอันดามัน ดูสถานะ DHW และคะแนน AI ล่วงหน้า 7 วัน', 'Andaman Sea marine monitoring area. View DHW status and the 7-day AI risk score.'],
    ['ระยอง · อ่าวไทย', 'Rayong · Gulf of Thailand'],
    ['กระบี่ · ทะเลอันดามัน', 'Krabi · Andaman Sea'],
    ['ดูสถานะ DHW คะแนน AI และผลย้อนหลังของเกาะมันใน', 'View DHW status, AI risk score, and historical results for Koh Mun Nai.'],
    ['ดูสถานะ DHW คะแนน AI และผลย้อนหลังของเกาะพีพี', 'View DHW status, AI risk score, and historical results for Phi Phi Islands.'],
    ['เปิดผลรายเกาะ', 'Open island results'],
    ['SeaGuard ทำงานอย่างไร', 'How SeaGuard Works'],
    ['ข้อมูลย้อนหลัง โมเดล AI และเกณฑ์ DHW ช่วยให้เห็นความเสี่ยงของแต่ละพื้นที่', 'Historical data, the AI model, and DHW criteria show risk by area.'],
    ['1. เตรียมข้อมูลย้อนหลัง', '1. Prepare Historical Data'],
    ['ใช้ข้อมูลอุณหภูมิทะเลและแถบสเปกตรัมที่มีวันที่กำกับ พร้อมแสดงวันที่ข้อมูลล่าสุด', 'Use dated sea-temperature and spectral-band data, and show when it was last updated.'],
    ['2. วิเคราะห์ด้วย AI', '2. Analyze with AI'],
    ['โมเดลอ่านข้อมูลย้อนหลัง 30 วันเพื่อให้คะแนนว่า DHW วันที่ +7 จะถึง 4 หรือไม่', 'The model uses a 30-day window to score whether DHW will reach 4 on day +7.'],
    ['3. ดูผลประกอบการตัดสินใจ', '3. Review Results'],
    ['ดูคะแนน AI ควบคู่ระดับเตือน DHW จากสูตร โดยตรวจวันที่ข้อมูลก่อนนำไปใช้', 'Review the AI score alongside formula-based DHW alerts, and check the data date before acting.'],

    // Island navigation and overview
    ['Home', 'หน้าแรก'],
    ['Multi-Temporal Satellite AI for Coral Bleaching Forecast', 'AI ดาวเทียมหลายช่วงเวลาสำหรับเฝ้าระวังปะการังฟอกขาว'],
    ['KohMunNai', 'เกาะมันใน'],
    ['Koh Mun Nai', 'เกาะมันใน'],
    ['Phi Phi Islands', 'หมู่เกาะพีพี'],
    ['Rayong Marine Research Sanctuary', 'พื้นที่วิจัยทางทะเล จังหวัดระยอง'],
    ['Phi Phi Islands, Krabi Province', 'หมู่เกาะพีพี จังหวัดกระบี่'],
    ['Koh Mun Nai is a small island in the Mun Islands, located in Klaeng District, Rayong Province. It stands as Thailand\'s primary sanctuary for sea turtle conservation, coral reef propagation, and critical marine resource preservation.', 'เกาะมันในเป็นเกาะขนาดเล็กในหมู่เกาะมัน อำเภอแกลง จังหวัดระยอง เป็นพื้นที่อนุรักษ์เต่าทะเล ฟื้นฟูแนวปะการัง และดูแลทรัพยากรทางทะเล'],
    ['Phi Phi Islands are part of Hat Noppharat Thara - Mu Ko Phi Phi National Park. Originally, sea nomads referred to the archipelago as “Pulau Piapi,” where “Pulau” means island and “Piapi” refers to a type of coastal vegetation similar to mangroves. Later, it came to be known as the “Pi Pi Tree,” which eventually evolved phonetically into “Phi Phi. ” It has earned the title "The Kingdom of Underwater Flora."', 'หมู่เกาะพีพีอยู่ในอุทยานแห่งชาติหาดนพรัตน์ธารา–หมู่เกาะพีพี จังหวัดกระบี่ เป็นพื้นที่ท่องเที่ยวและระบบนิเวศทางทะเลที่สำคัญ'],
    ['Bleaching Simulation', 'จำลองความเครียดของปะการัง'],
    ['DHW projection', 'แนวโน้ม DHW'],
    ['อัปเดตข้อมูลล่าสุด', 'Latest data'],
    ['MMM Threshold', 'MMM threshold'],
    ['Gulf of Thailand', 'อ่าวไทย'],
    ['Andaman Sea', 'ทะเลอันดามัน'],
    ['NOAA CRW Heat-Stress Criteria', 'เกณฑ์ความเครียดความร้อน NOAA CRW'],
    ['Alert levels use current HotSpot together with accumulated DHW.', 'ระดับเตือนคำนวณจาก HotSpot ปัจจุบันร่วมกับ DHW สะสม'],
    ['Simulation Module 01', 'โมดูลจำลอง'],
    ['How Sea Temperature Affects Coral', 'อุณหภูมิทะเลส่งผลต่อปะการังอย่างไร'],
    ['Coral reefs are highly sensitive to changes in sea surface temperature. When water temperatures rise above the normal range, corals become stressed and may expel the symbiotic algae that provide them with energy and color.', 'ปะการังไวต่ออุณหภูมิผิวน้ำทะเล เมื่ออุณหภูมิสูงกว่าปกติ ปะการังอาจเกิดความเครียดและขับสาหร่ายที่ช่วยให้พลังงานและสีสันออก'],
    ['As temperature stress increases, coral bleaching becomes more severe. Prolonged exposure to high temperatures can weaken corals and increase the risk of mortality.', 'ความเครียดจากความร้อนที่เพิ่มและยาวนานอาจทำให้ปะการังฟอกขาวรุนแรงขึ้น อ่อนแอลง และเสี่ยงตายมากขึ้น'],
    ['ระดับความเครียดจากความร้อน · ภาพประกอบตามสูตร', 'Heat-stress level · formula-based illustration'],
    ['รอผลจาก API', 'Waiting for API'],
    ['Interactive Water Temperature Controls', 'ปรับอุณหภูมิน้ำทะเล'],
    ['ปรับ SST สมมติ เพื่อดู DHW จากสูตรและสีประกอบ ไม่ใช่ภาพปะการังจริง', 'Adjust hypothetical SST to see formula-based DHW and an illustrative coral color—not a real coral observation.'],
    ['Water Temp', 'อุณหภูมิน้ำ'],
    ['Temperature slider', 'ตัวเลื่อนอุณหภูมิ'],
    ['26.0°C ', '26.0°C (slider minimum)'],
    ['34.0°C ', '34.0°C (slider maximum)'],
    ['Healthy Zooxanthellae', 'สาหร่ายในปะการังยังสมบูรณ์'],
    ['Algae Expulsion', 'ปะการังขับสาหร่ายออก'],
    ['Coral Skeleton Exposure', 'โครงกระดูกปะการังปรากฏ'],
    ['STATUS: รอผลจาก API', 'STATUS: Waiting for API'],
    ['DHW ปัจจุบัน (', 'Current DHW ('],
    ['DHW จากสูตร (', 'Formula DHW ('],
    ['รอผลสถานการณ์จำลองจาก API · สีปะการังเป็นภาพประกอบ', 'Waiting for simulated results · coral color is illustrative'],
    ['แนวโน้ม DHW', 'DHW trend'],
    ['คำนวณจากสูตร · ไม่ใช่ AI', 'Formula-based · not AI'],
    ['🔄 โหลดใหม่', '🔄 Refresh'],
    ['SST ประมาณการ', 'Projected SST'],
    ['DHW ประมาณการ', 'Projected DHW'],
    ['เกาะมันใน ', 'Koh Mun Nai'],
    ['เกาะพีพี ', 'Phi Phi Islands'],
    ['กำลังคำนวณสถานการณ์จำลอง...', 'Calculating scenario…'],
    ['SeaGuard · Marine & Coral Reef Monitoring, Koh Mun Nai, Rayong Province', 'SeaGuard · ติดตามทะเลและแนวปะการัง เกาะมันใน จังหวัดระยอง'],
    ['SeaGuard · Marine & Coral Reef Monitoring, Phi Phi Islands, Krabi Province', 'SeaGuard · ติดตามทะเลและแนวปะการัง หมู่เกาะพีพี จังหวัดกระบี่'],
    ['Koh Mun Nai Marine Life', 'สิ่งมีชีวิตทางทะเลเกาะมันใน'],
    ['Phi Phi Islands Marine Life', 'สิ่งมีชีวิตทางทะเลหมู่เกาะพีพี'],
    ['Toggle navigation menu', 'เปิดหรือปิดเมนูนำทาง'],

    // Model results and shared status labels
    ['AI Risk Score (7 วัน)', 'AI Risk Score (7 days)'],
    ['คะแนนว่า DHW อีก 7 วันจะถึง 4 หรือไม่ · ไม่ใช่เปอร์เซ็นต์', 'Score for whether DHW will reach 4 in 7 days · not a probability percentage'],
    ['รีเฟรช', 'Refresh'],
    ['OFFLINE — โหลดโมเดล AI หรือ API ไม่ได้', 'OFFLINE — AI model or API unavailable'],
    ['กฎ DHW · สูตร', 'DHW rule · formula'],
    ['DHW ≥ 3 และกำลังเพิ่มขึ้น', 'DHW ≥ 3 and rising'],
    ['NOAA ปัจจุบัน: --', 'Current NOAA level: --'],
    ['ข้อมูลล่าสุด: --', 'Latest data: --'],
    ['Time Machine · ดูผลย้อนหลัง', 'Time Machine · view historical results'],
    ['เลือกวันที่ประเมิน', 'Select assessment date'],
    ['ต่ำ', 'Low'],
    ['สูง', 'High'],
    ['เตือน', 'Warning'],
    ['ไม่เตือน', 'No alert'],
    ['ไม่มีความเครียด', 'No stress'],
    ['เฝ้าระวัง', 'Watch'],
    ['เตือนภัยระดับ 1', 'Alert Level 1'],
    ['เตือนภัยระดับ 2', 'Alert Level 2'],
    ['ไม่มีผลจาก API', 'No API result'],
    ['ยังไม่มีผลจริงของวันที่ +7', 'No observed result for day +7 yet'],
    ['OFFLINE — ไม่สามารถคำนวณได้', 'OFFLINE — calculation unavailable'],
    ['ไม่มีผลจำลองจาก API', 'No simulated API result'],
    ['ไม่มีการคำนวณฝั่งเว็บ กรุณาเปิด SeaGuard API แล้วลองใหม่', 'No local fallback. Start the SeaGuard API and try again.'],
    ['HotSpot ไม่เกิน 0 °C', 'HotSpot is at or below 0 °C'],
    ['NOAA No Stress', 'NOAA ไม่มีความเครียด'],
    ['NOAA Bleaching Watch', 'NOAA เฝ้าระวัง'],
    ['NOAA Bleaching Warning', 'NOAA เตือน'],
    ['NOAA Bleaching Alert Level 1', 'NOAA เตือนภัยระดับ 1'],
    ['NOAA Bleaching Alert Level 2', 'NOAA เตือนภัยระดับ 2']
  ];

  const lookup = new Map();
  for (const [first, second] of pairs) {
    const englishFirst = !/[ก-๙]/.test(first) && /[ก-๙]/.test(second);
    const th = englishFirst ? second : first;
    const en = englishFirst ? first : second;
    const pair = { th, en };
    lookup.set(normalize(th), pair);
    lookup.set(normalize(en), pair);
  }

  let language = 'th';
  try {
    language = localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'th';
  } catch (_) { /* Private browsing can disable storage. */ }

  function localizeLevel(value, target) {
    return lookup.get(normalize(value))?.[target] || value;
  }

  function dynamic(value, target) {
    let match;
    if ((match = value.match(/^ข้อมูลล่าสุด (\d{4}-\d{2}-\d{2}) · (?:ย้อนหลัง|เก่า) (\d+) วัน$/)) ||
        (match = value.match(/^Latest data (\d{4}-\d{2}-\d{2}) · (\d+) days old$/))) {
      return target === 'en' ? `Latest data ${match[1]} · ${match[2]} days old` :
        `ข้อมูลล่าสุด ${match[1]} · ${Number(match[2]) > 14 ? 'ย้อนหลัง' : 'เก่า'} ${match[2]} วัน`;
    }
    if ((match = value.match(/^ข้อมูลล่าสุด: (\d{4}-\d{2}-\d{2})$/)) ||
        (match = value.match(/^Latest data: (\d{4}-\d{2}-\d{2})$/))) {
      return target === 'en' ? `Latest data: ${match[1]}` : `ข้อมูลล่าสุด: ${match[1]}`;
    }
    if ((match = value.match(/^ข้อมูลย้อนหลัง (\d+) วัน · ไม่ใช่สถานะปัจจุบัน$/)) ||
        (match = value.match(/^Historical data \((\d+) days old\) · not current$/))) {
      return target === 'en' ? `Historical data (${match[1]} days old) · not current` :
        `ข้อมูลย้อนหลัง ${match[1]} วัน · ไม่ใช่สถานะปัจจุบัน`;
    }
    if ((match = value.match(/^DHW วันนี้ ([\d.]+) · 7 วันก่อน ([\d.]+)$/)) ||
        (match = value.match(/^DHW today ([\d.]+) · 7 days ago ([\d.]+)$/))) {
      return target === 'en' ? `DHW today ${match[1]} · 7 days ago ${match[2]}` :
        `DHW วันนี้ ${match[1]} · 7 วันก่อน ${match[2]}`;
    }
    if ((match = value.match(/^NOAA ปัจจุบัน: (.+) \(DHW ([\d.]+)\)$/)) ||
        (match = value.match(/^Current NOAA level: (.+) \(DHW ([\d.]+)\)$/))) {
      return target === 'en' ? `Current NOAA level: ${localizeLevel(match[1], 'en')} (DHW ${match[2]})` :
        `NOAA ปัจจุบัน: ${localizeLevel(match[1], 'th')} (DHW ${match[2]})`;
    }
    if ((match = value.match(/^ผลจริง (\d{4}-\d{2}-\d{2}): DHW ([\d.]+) · (ถึงเกณฑ์ 4|ไม่ถึงเกณฑ์ 4)$/)) ||
        (match = value.match(/^Observed (\d{4}-\d{2}-\d{2}): DHW ([\d.]+) · (reached 4|below 4)$/))) {
      const reached = match[3] === 'ถึงเกณฑ์ 4' || match[3] === 'reached 4';
      return target === 'en' ? `Observed ${match[1]}: DHW ${match[2]} · ${reached ? 'reached 4' : 'below 4'}` :
        `ผลจริง ${match[1]}: DHW ${match[2]} · ${reached ? 'ถึงเกณฑ์ 4' : 'ไม่ถึงเกณฑ์ 4'}`;
    }
    if ((match = value.match(/^STATUS: (.+)$/))) {
      return `STATUS: ${localizeLevel(match[1], target)}`;
    }
    if ((match = value.match(/^(\d+) วัน$/)) || (match = value.match(/^(\d+) days$/))) {
      return target === 'en' ? `${match[1]} days` : `${match[1]} วัน`;
    }
    if ((match = value.match(/^(\d+) วันข้างหน้า$/)) || (match = value.match(/^Next (\d+) days$/))) {
      return target === 'en' ? `Next ${match[1]} days` : `${match[1]} วันข้างหน้า`;
    }
    if ((match = value.match(/^HotSpot (-?[\d.]+) °C และ DHW ([\d.]+) °C-weeks$/)) ||
        (match = value.match(/^HotSpot (-?[\d.]+) °C and DHW ([\d.]+) °C-weeks$/))) {
      return target === 'en' ? `HotSpot ${match[1]} °C and DHW ${match[2]} °C-weeks` :
        `HotSpot ${match[1]} °C และ DHW ${match[2]} °C-weeks`;
    }
    if ((match = value.match(/^HotSpot (-?[\d.]+) °C; DHW ยังต่ำกว่า Alert Level 1$/)) ||
        (match = value.match(/^HotSpot (-?[\d.]+) °C; DHW remains below Alert Level 1$/))) {
      return target === 'en' ? `HotSpot ${match[1]} °C; DHW remains below Alert Level 1` :
        `HotSpot ${match[1]} °C; DHW ยังต่ำกว่า Alert Level 1`;
    }
    if ((match = value.match(/^HotSpot (-?[\d.]+) °C ยังต่ำกว่าเกณฑ์สะสม 1 °C$/)) ||
        (match = value.match(/^HotSpot (-?[\d.]+) °C is below the 1 °C accumulation threshold$/))) {
      return target === 'en' ? `HotSpot ${match[1]} °C is below the 1 °C accumulation threshold` :
        `HotSpot ${match[1]} °C ยังต่ำกว่าเกณฑ์สะสม 1 °C`;
    }
    return null;
  }

  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE ||
        /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.parentElement?.tagName || '') ||
        node.parentElement?.closest('[data-lang-toggle]')) return;
    const source = node.nodeValue;
    const key = normalize(source);
    if (!key) return;
    const result = lookup.get(key)?.[language] || dynamic(key, language);
    const translated = result && normalize(result);
    if (translated && translated !== key) {
      const next = source.match(/^\s*/)[0] + translated + source.match(/\s*$/)[0];
      if (next !== source) node.nodeValue = next;
    }
  }

  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) return translateNode(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode);
  }

  function translateAttributes() {
    for (const element of document.querySelectorAll('[aria-label], [alt], [title], meta[name="description"]')) {
      if (element.matches('[data-lang-toggle]')) continue;
      for (const name of ['aria-label', 'alt', 'title', 'content']) {
        if (!element.hasAttribute(name)) continue;
        const source = element.getAttribute(name);
        const result = lookup.get(normalize(source))?.[language];
        if (result) element.setAttribute(name, result);
      }
    }
  }

  function updateButton() {
    document.documentElement.lang = language;
    for (const button of document.querySelectorAll('[data-lang-toggle]')) {
      button.textContent = language === 'th' ? 'EN' : 'TH';
      button.setAttribute('aria-label', language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
      button.setAttribute('title', language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
    }
  }

  function setLanguage(next) {
    language = next === 'en' ? 'en' : 'th';
    try { localStorage.setItem(STORAGE_KEY, language); } catch (_) { /* Storage unavailable. */ }
    updateButton();
    translateTree(document.documentElement);
    translateAttributes();
    document.dispatchEvent(new CustomEvent('seaguard:languagechange', { detail: { language } }));
  }

  window.SeaGuardI18n = {
    getLanguage: () => language,
    setLanguage,
    translate: (value) => lookup.get(normalize(value))?.[language] || dynamic(normalize(value), language) || value
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-lang-toggle]')) setLanguage(language === 'th' ? 'en' : 'th');
  });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') translateNode(record.target);
      for (const node of record.addedNodes) translateTree(node);
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  updateButton();
  translateTree(document.documentElement);
  translateAttributes();
})();

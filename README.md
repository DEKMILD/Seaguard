# SeaGuard Coral Heat-Stress Monitor

เว็บทดลองสำหรับดู AI risk score ว่า DHW วันที่ +7 จะถึง 4 หรือไม่ และจำลองค่า Degree Heating Weeks (DHW) จาก SST สมมติในช่วง 1–28 วัน ผลลัพธ์เป็นดัชนีความเครียดจากความร้อน ไม่ใช่การยืนยันว่าปะการังฟอกขาวจริง

## ส่วนประกอบ

- `app.py` — FastAPI สำหรับ `/risk`, `/api/model-info`, `/predict`, `/islands` และ `/simulate`
- `models/` — ensemble 5 seeds, scaler, threshold และ metadata ของ Fold A/B
- `risk.js` — การ์ด AI Risk Score และ Time Machine ของหน้าเกาะ
- `i18n.js` — ปุ่มสลับภาษาไทย/อังกฤษบนหน้าเว็บ และจำภาษาที่เลือกข้ามหน้า
- `make_island_state.py` — สร้าง `island_state.json` จาก CSV
- `KohMunNai.html`, `PhiPhiIslands.html` — หน้าเว็บจำลองรายเกาะ
- `final_data_*.csv` — ข้อมูล SST, anomaly, DHW และ spectral bands

## ติดตั้งและรัน

ต้องใช้ Python 3.10 ขึ้นไป

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python make_island_state.py
uvicorn app:app --reload --port 8000
```

จากนั้นเปิด `http://127.0.0.1:8000/` ได้ทันที FastAPI จะเสิร์ฟทั้ง API และหน้าเว็บ จึงไม่ต้องเปิด static server แยก ปุ่มภาษาอยู่มุมขวาบน

API documentation อยู่ที่ `http://127.0.0.1:8000/docs`

รันทดสอบด้วย:

```powershell
python -m unittest discover -s tests -v
```

## Render Free (ทดลองเผยแพร่)

ไฟล์ `render.yaml` ตั้งค่า FastAPI, หน้าเว็บ และ API ให้อยู่ใน Web Service เดียวกันบนแพ็กเกจ Free โดยใช้ `/api/model-info` เป็น health check ที่ตอบ 503 ถ้าโมเดลโหลดไม่สำเร็จ

1. นำ **ไฟล์ในโฟลเดอร์นี้** รวม `models/`, CSV, `photo/` และ `render.yaml` ขึ้น Git repository โดยให้โฟลเดอร์นี้เป็น root ของ repository (ห้ามอัปโหลด `.env` หรือข้อมูลลับ)
2. เชื่อม repository กับ Render แล้วสร้าง Blueprint จาก `render.yaml` ตรวจว่าเลือก `plan: free` ก่อนยืนยัน
3. หลัง deploy เปิด URL `https://<ชื่อบริการ>.onrender.com/`, `/KohMunNai.html`, `/PhiPhiIslands.html`, `/api/model-info` และ `/risk?island=phi_phi` จากอุปกรณ์อีกเครื่อง ตรวจว่า AI ใช้งานได้จริง ไม่ใช่แค่หน้าเว็บเปิดได้

**ข้อจำกัด:** Render Free พักบริการเมื่อไม่มีผู้ใช้ประมาณ 15 นาทีและอาจใช้เวลาประมาณหนึ่งนาทีในการตื่นครั้งแรก แพ็กเกจนี้มี RAM 512 MB; การวัดบน Windows หลังเรียกโมเดลสองเกาะใช้ประมาณ 460 MiB จึงใกล้ขีดจำกัดมาก และ **ยังไม่ได้ยืนยันว่ารันผ่านบน Render** หาก build/boot ล้มเพราะหน่วยความจำ ห้ามถือว่ามีลิงก์พร้อมส่งหรือเปลี่ยนเป็นแพ็กเกจเสียเงินโดยไม่อนุมัติ

## Configuration

- `ISLAND_STATE` — path ของไฟล์ state; ค่าเริ่มต้นคือ `island_state.json` ข้าง `app.py`
- `CORS_ORIGINS` — origin ภายนอกที่อนุญาต คั่นด้วย comma; หน้าเว็บที่ FastAPI เสิร์ฟเองเป็น same-origin และไม่ต้องพึ่ง CORS
- `ANOM_WATCH_C`, `ANOM_WARNING_C`, `ANOM_CRITICAL_C` — threshold ของ anomaly

ค่า anomaly threshold ต้องเรียงจากน้อยไปมาก ไม่เช่นนั้น API จะหยุดพร้อมข้อความอธิบาย ค่าเหล่านี้เป็นเกณฑ์ทดลองของ SeaGuard ไม่ใช่มาตรฐาน NOAA

## เกณฑ์การเตือนภัย

SeaGuard ใช้หลักการจาก NOAA Coral Reef Watch (CRW):

- Coral Bleaching HotSpot คือ SST ที่สูงกว่า Maximum Monthly Mean (MMM)
- นับ HotSpot เข้าค่า DHW เฉพาะวันที่ HotSpot ≥ 1°C และสะสมในหน้าต่าง 12 สัปดาห์ (84 วัน)
- No Stress: HotSpot ≤ 0°C
- Bleaching Watch: 0°C < HotSpot < 1°C
- Bleaching Warning: HotSpot ≥ 1°C และ DHW < 4°C-weeks
- Bleaching Alert Level 1: HotSpot ≥ 1°C และ 4 ≤ DHW < 8°C-weeks
- Bleaching Alert Level 2: HotSpot ≥ 1°C และ DHW ≥ 8°C-weeks

โปรเจกต์ใช้ตารางแบบย่อถึง Alert Level 2 ตามขอบเขตของงานนี้ ส่วนผลิตภัณฑ์ NOAA CRW 5km Bleaching Alert Area v3.1 ปัจจุบันมี Alert Levels 3–5 เพิ่มที่ DHW 12, 16 และ 20°C-weeks จึงไม่ควรตีความว่า SeaGuard รองรับตาราง v3.1 ครบทุกระดับ

แหล่งอ้างอิงทางการ:

- [NOAA CRW 5km Product Methodology](https://coralreefwatch.noaa.gov/product/5km/methodology.php)
- [NOAA CRW Bleaching Alert Area — Single Day](https://coralreefwatch.noaa.gov/product/5km/index_5km_baa.php)

ค่า SST anomaly เฉลี่ย 30 วันที่ `1.0/1.4/1.8°C` เป็นเกณฑ์ทดลองเดิมของ SeaGuard และ API จะติดป้าย `custom_*` เพื่อไม่ให้สับสนกับระดับ NOAA

## AI Risk Score และ Time Machine

- `phi_phi` ใช้ Fold A และ `man_nai` ใช้ Fold B ซึ่งเป็น fold ที่ไม่ได้ฝึกด้วยเกาะเป้าหมาย
- score เป็นค่าเฉลี่ยจากโมเดล 5 seeds และใช้ threshold `0.5`
- score ไม่ได้ calibrate เพราะ validation ไม่มี positive จึงไม่ใช่เปอร์เซ็นต์ความน่าจะเป็น
- `/risk?island=phi_phi` ใช้ข้อมูลล่าสุด ส่วน `as_of=YYYY-MM-DD` ใช้ตรวจย้อนหลังกับ DHW จริงวันที่ +7
- กฎ baseline คือ DHW ≥ 3 และกำลังเพิ่มขึ้น ส่วนกราฟ DHW, What-if SST และระดับ NOAA ใน simulation ยังคำนวณด้วยสูตร ไม่ใช่โมเดล

### สถานะการประเมินสำหรับรายงาน

หน้าแรก `/` แสดงทางเข้าผลรายเกาะ วันที่ข้อมูลล่าสุด และสถานะระบบ ส่วนเหตุผลเชิงธุรกิจและแผน pilot อยู่ใน `PITCH_AND_EVALUATION.md` ไม่ใช้การทดสอบ 10 รอบเป็นหลักฐานความแม่นยำอีก ผลที่บันทึกใน `models/metrics.json` มาจาก Fold A/B ที่ฝึกกับเกาะหนึ่งและทดสอบกับอีกเกาะ **ไม่ใช่** time-series train 70% / test 30%

ถ้าแบ่งข้อมูลแต่ละเกาะตามเวลาโดยใช้ 70% แรก train และ 30% ท้าย test จะได้ test ที่ไม่มี label `DHW วันที่ +7 ≥ 4` ทั้งสองเกาะ จึงไม่ควรอ้าง accuracy บนชุดนี้ว่าพิสูจน์การเตือนเหตุการณ์ได้ แนวทางที่เสนอคือ time-series 70/30 บนช่วงประวัติที่ test มีเหตุการณ์ โดยระบุการเลือกช่วงย้อนหลังนี้ตรง ๆ และประเมินใหม่โดยไม่ใช้ test เลือก threshold หรือปรับโมเดล ขณะนี้ยัง **ไม่ได้** เทรน/ประเมินโมเดลแบบ 70/30

| เกาะ | ช่วง test 30% ท้ายหลัง preprocessing | test windows | label=1 |
|---|---|---:|---:|
| เกาะมันใน | 2025-03-05 ถึง 2025-12-31 | 266 | 0 |
| เกาะพีพี | 2025-05-14 ถึง 2026-09-14 | 453 | 0 |

ตัวเลขนี้เป็นการนับ window เพื่อเช็กความเป็นไปได้ของ split เท่านั้น **ไม่ใช่ผลการเทรนหรือคะแนนโมเดล**

รอบที่เสนอและคำอธิบายข้อจำกัดอยู่ใน [PITCH_AND_EVALUATION.md](PITCH_AND_EVALUATION.md): จำกัดช่วง 2023-04-01 ถึง 2024-08-31, แบ่ง 363/156 วันต่อเกาะ, train รวม 654 windows (positive 71), test รวม 240 windows (positive 79) นี่เป็นการเลือกช่วงย้อนหลังให้มีเหตุการณ์ใน test และไม่ได้แปลว่าโมเดลผ่านการประเมินแล้ว

ดูโครง pitch 7 นาทีและคำถามสำหรับอาจารย์ใน [PITCH_AND_EVALUATION.md](PITCH_AND_EVALUATION.md)

### ที่มาของ MMM ในข้อมูลตัวอย่าง

- เกาะมันใน: `29.70°C`
- เกาะพีพี: `30.40°C`

สองค่านี้เป็นพารามิเตอร์ที่ปรับให้เข้ากับคอลัมน์ `dhw` ใน CSV ของโปรเจกต์ ไม่ใช่ค่า NOAA MMM climatology ที่ดาวน์โหลดจาก NOAA โดยตรง การตรวจ grid search ช่วง 0.01°C ให้ค่าที่เหมาะสุดประมาณ `29.71°C` และ `30.39°C` ตามลำดับ จึงคงค่าปัดเศษเดิมไว้ ที่มาและสถานะนี้ถูกบันทึกใน `island_state.json` ช่อง `mmm_source`

## ข้อจำกัด

- แต่ละเกาะมีเหตุการณ์ข้าม DHW 4 เพียงครั้งเดียว จึงยังมีข้อจำกัดด้านการประเมินเหตุการณ์ใหม่
- MMM เป็นค่าที่ปรับจากข้อมูลทั้งชุด ไม่ใช่ climatology อิสระสำหรับประเมินโมเดล
- ความถูกต้องขึ้นกับวันที่ล่าสุดใน `island_state.json`; ควรสร้าง state ใหม่เมื่อ CSV อัปเดต
- เมื่อโหลดโมเดลหรือ API ไม่ได้ หน้าเว็บจะแสดง `OFFLINE` และไม่สร้าง AI score ทดแทน
- ก่อนใช้ AI ในงานจริงต้องเพิ่มเหตุการณ์/เกาะ ตรวจ MMM จากแหล่งอิสระ และแบ่ง validation ใหม่ให้มีทั้งสองคลาส การเลือก threshold หรือ fit calibrator ต้องใช้ validation ที่แยกจาก train ไม่ใช้ test ตัดสิน

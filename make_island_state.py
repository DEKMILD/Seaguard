"""สร้างไฟล์ island_state.json ให้ API (app.py) ใช้
วางไว้โฟลเดอร์เดียวกับไฟล์ CSV แล้วรัน:  python make_island_state.py
(ใน Colab: วางเป็น cell เดียวแล้วกดรันได้เลย)
"""
import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

# MMM ด้านล่างเป็นค่าพารามิเตอร์ที่ fit กับคอลัมน์ DHW ใน CSV ชุดนี้ ไม่ใช่ NOAA MMM climatology
# grid search step 0.01 ให้ค่าที่เหมาะสุดราว 29.71 (มันใน) และ 30.39 (พีพี)
ISLANDS = {
    "phi_phi": ("final_data_KohPhiPhi.csv", 30.40, "calibrated_to_csv_dhw; approximate grid-search optimum 30.39 C"),
    "man_nai": ("final_data_KohManNai_1.csv", 29.70, "calibrated_to_csv_dhw; approximate grid-search optimum 29.71 C"),
}

state = {}
for key, (path, mmm, mmm_source) in ISLANDS.items():
    csv_path = BASE_DIR / path
    df = pd.read_csv(csv_path)
    required_columns = {"sst", "dhw", "date"}
    missing_columns = required_columns.difference(df.columns)
    if missing_columns:
        raise ValueError(f"{csv_path.name} ขาดคอลัมน์: {sorted(missing_columns)}")
    if len(df) < 84:
        raise ValueError(f"{csv_path.name} ต้องมีข้อมูลอย่างน้อย 84 แถว")
    if df[["sst", "dhw", "date"]].isna().any().any():
        raise ValueError(f"{csv_path.name} มีค่าว่างในคอลัมน์ที่จำเป็น")
    state[key] = {
        "mmm": mmm,
        "mmm_source": mmm_source,
        "sst_last84": [round(float(v), 3) for v in df["sst"].values[-84:]],
        "dhw_now": float(df["dhw"].iloc[-1]),
        "dhw_7d_ago": float(df["dhw"].iloc[-8]),
        "date_last": str(df["date"].iloc[-1]),
    }

with (BASE_DIR / "island_state.json").open("w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=1)

for k, v in state.items():
    print(k, "| data through", v["date_last"], "| latest DHW", v["dhw_now"])

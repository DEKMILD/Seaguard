"""SeaGuard Coral Heat-Stress Alert API (v0.4)

ประเมินความเสี่ยงที่ DHW จะถึงเกณฑ์ 4 ภายใน ~7 วัน
วิธีหลัก : DHW ปัจจุบัน + แนวโน้มขาขึ้น (เทียบ DHW 7 วันก่อน)
วิธีสำรอง: ค่าเฉลี่ย SST anomaly 30 วันย้อนหลัง (เมื่อไม่มีค่า DHW)
หมายเหตุ : เป็นดัชนีความเครียดความร้อน ไม่ใช่การยืนยันว่าปะการังฟอกขาวจริง

รัน:  pip install -r requirements.txt
      uvicorn app:app --reload --port 8000
"""
import json
import os
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Literal, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator

from coral import (DHW_THRESHOLD, FILES as CORAL_FILES, H as MODEL_HORIZON,
                   MMM as CORAL_MMM, RULE_DHW, T as MODEL_WINDOW,
                   feature_columns, load_island, make_inference_window,
                   make_windows, scale_windows)

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
ISLAND_MODEL_FOLD = {"phi_phi": "FoldA", "man_nai": "FoldB"}

# NOAA Coral Reef Watch: Bleaching Alert Area ต้องพิจารณา HotSpot ปัจจุบันร่วมกับ DHW
# โปรเจกต์ใช้ชุดย่อถึง Alert Level 2; v3.1 ปัจจุบันของ NOAA มี Alert Levels 3-5 เพิ่มเติม
NOAA_HOTSPOT_THRESHOLD_C = 1.0
NOAA_ALERT_LEVEL_1_DHW = 4.0
NOAA_ALERT_LEVEL_2_DHW = 8.0

# ---- เกณฑ์วิธีสำรอง: ค่าเฉลี่ย anomaly 30 วัน (องศา C) ----
ANOM_WATCH = float(os.getenv("ANOM_WATCH_C", 1.0))
ANOM_WARNING = float(os.getenv("ANOM_WARNING_C", 1.4))
ANOM_CRITICAL = float(os.getenv("ANOM_CRITICAL_C", 1.8))
if not ANOM_WATCH < ANOM_WARNING < ANOM_CRITICAL:
    raise RuntimeError("ต้องกำหนด ANOM_WATCH_C < ANOM_WARNING_C < ANOM_CRITICAL_C")

WINDOW = 30
HORIZON_DAYS = 7
NOAA_LEVEL_TH = {
    "no_stress": "ไม่มีความเครียด",
    "watch": "เฝ้าระวัง",
    "warning": "เตือน",
    "alert_level_1": "เตือนภัยระดับ 1",
    "alert_level_2": "เตือนภัยระดับ 2",
}
ANOMALY_LEVEL_TH = {
    "custom_normal": "ปกติ (เกณฑ์ทดลอง)",
    "custom_watch": "เฝ้าระวัง (เกณฑ์ทดลอง)",
    "custom_warning": "เตือน (เกณฑ์ทดลอง)",
    "custom_critical": "วิกฤต (เกณฑ์ทดลอง)",
}

app = FastAPI(
    title="SeaGuard Coral Bleaching Prediction API",
    version="0.4.0",
    description="API ประเมินความเสี่ยงความเครียดความร้อนของปะการัง (DHW>=4 ใน ~7 วัน)",
)

# หน้าเว็บต้องรันผ่าน HTTP server (ไม่ใช่ file://) และอนุญาตเฉพาะ origin ที่กำหนด
# เพิ่ม origin สำหรับ production ผ่าน CORS_ORIGINS โดยคั่นด้วย comma
DEFAULT_ORIGINS = "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000,http://localhost:8000"
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PredictionRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    dhw: Optional[float] = Field(
        None, ge=0,
        description="DHW ของวันที่ทำนาย (ผลิตภัณฑ์เดียวกับข้อมูลเทรน เช่น NOAA Coral Reef Watch)",
    )
    dhw_7d_ago: Optional[float] = Field(
        None, ge=0, description="DHW ของ 7 วันก่อนหน้า ใช้ตรวจแนวโน้มขาขึ้น (แนะนำให้ส่ง)",
    )
    hotspot: Optional[float] = Field(
        None,
        description="Coral Bleaching HotSpot ปัจจุบัน (°C เทียบกับ MMM); จำเป็นเมื่อส่ง dhw",
    )
    sst_anomaly: Optional[List[float]] = Field(
        None, min_length=WINDOW, max_length=WINDOW,
        description="SST anomaly รายวัน 30 ค่า (C) เรียงเก่าไปใหม่ ใช้เมื่อไม่มี dhw "
                    "และต้องคำนวณด้วย climatology เดียวกับข้อมูลเทรน",
    )
    location: Optional[str] = Field(None, description="ชื่อเกาะ (ไม่ใช้คำนวณ)")

    @model_validator(mode="after")
    def need_one_input(self):
        if (self.dhw is None) == (self.sst_anomaly is None):
            raise ValueError("ต้องส่งอย่างใดอย่างหนึ่งระหว่าง dhw หรือ sst_anomaly")
        if self.dhw is not None and self.hotspot is None:
            raise ValueError("ต้องส่ง hotspot ร่วมกับ dhw เพื่อจัดระดับตาม NOAA")
        return self


class PredictionResponse(BaseModel):
    method: Literal["noaa_hotspot_dhw", "anomaly_mean_30d_custom"]
    score: float
    unit: str
    rising: Optional[bool]
    level: str
    level_th: str
    horizon_days: int
    thresholds: dict
    note: str


def classify_dhw(dhw: float, hotspot: float) -> str:
    """จัดระดับด้วยเกณฑ์ NOAA CRW แบบย่อถึง Alert Level 2."""
    if hotspot <= 0:
        return "no_stress"
    if hotspot < NOAA_HOTSPOT_THRESHOLD_C:
        return "watch"
    if dhw >= NOAA_ALERT_LEVEL_2_DHW:
        return "alert_level_2"
    if dhw >= NOAA_ALERT_LEVEL_1_DHW:
        return "alert_level_1"
    return "warning"


def classify_anom(score: float) -> str:
    if score >= ANOM_CRITICAL:
        return "custom_critical"
    if score >= ANOM_WARNING:
        return "custom_warning"
    if score >= ANOM_WATCH:
        return "custom_watch"
    return "custom_normal"


class RiskRuntime:
    """โหลดโมเดลและข้อมูลหนึ่งครั้ง แล้วเก็บไว้ใช้ตลอดอายุ server process."""

    def __init__(self):
        self.error: Optional[str] = None
        self.metadata = {}
        self.folds = {}
        self.data = {}
        self.historical_windows = {}
        try:
            import tensorflow as tf

            self.metadata = json.loads((MODEL_DIR / "metadata.json").read_text(encoding="utf-8"))
            expected_features = feature_columns()
            if self.metadata.get("feature_order") != expected_features:
                raise ValueError("feature order ใน metadata ไม่ตรงกับ coral.py")
            if self.metadata.get("window_days") != MODEL_WINDOW or self.metadata.get("horizon_days") != MODEL_HORIZON:
                raise ValueError("window/horizon ใน metadata ไม่ตรงกับ coral.py")

            for fold_id, fold_meta in self.metadata["folds"].items():
                scaler = joblib.load(MODEL_DIR / fold_meta["scaler"])
                threshold = float(joblib.load(MODEL_DIR / fold_meta["threshold"]))
                calibrator = joblib.load(MODEL_DIR / fold_meta["calibrator"])
                if calibrator is not None or fold_meta.get("calibration_fitted"):
                    raise ValueError(f"{fold_id} ต้องเป็น uncalibrated ตาม metadata")
                models = []
                for item in fold_meta["models"]:
                    model = tf.keras.models.load_model(MODEL_DIR / item["file"], compile=False)
                    if tuple(model.input_shape[1:]) != (MODEL_WINDOW, len(expected_features)) or tuple(model.output_shape[1:]) != (1,):
                        raise ValueError(f"shape ของ {item['file']} ไม่ตรงกับ metadata")
                    models.append((int(item["seed"]), model))
                self.folds[fold_id] = {"scaler": scaler, "threshold": threshold, "models": models}

            for island, csv_name in CORAL_FILES.items():
                df = load_island(BASE_DIR / csv_name, CORAL_MMM[island])
                X, y, meta = make_windows(df, expected_features)
                history = {}
                for i, current_date in enumerate(meta["date_now"]):
                    history[str(pd.Timestamp(current_date).date())] = {
                        "X": X[i:i + 1],
                        "target_date": str(pd.Timestamp(meta["date_target"][i]).date()),
                        "target_dhw": float(meta["dhw_target"][i]),
                        "target_label": bool(y[i]),
                    }
                self.data[island] = df
                self.historical_windows[island] = history
        except Exception as exc:  # หน้าเว็บยังเสิร์ฟได้ แต่ endpoint AI ต้องตอบ 503
            self.error = f"{type(exc).__name__}: {exc}"

    def require_ready(self):
        if self.error:
            raise HTTPException(503, f"AI model unavailable: {self.error}")


RISK_RUNTIME = RiskRuntime()


@app.get("/api/health")
def health():
    return {
        "service": "SeaGuard", "status": "ok", "window_days": WINDOW,
        "horizon_days": HORIZON_DAYS, "ai_model_ready": RISK_RUNTIME.error is None,
    }


@app.get("/api/model-info")
def model_info():
    RISK_RUNTIME.require_ready()
    return {
        "name": "SeaGuard DHW+7 binary risk ensemble",
        "target": "AI risk score that DHW at t+7 is >= 4; score is not a calibrated probability",
        "feature_order": RISK_RUNTIME.metadata["feature_order"],
        "window_days": RISK_RUNTIME.metadata["window_days"],
        "horizon_days": RISK_RUNTIME.metadata["horizon_days"],
        "island_fold": ISLAND_MODEL_FOLD,
        "folds": {
            fold: {
                "models": [item["file"] for item in meta["models"]],
                "train_range": meta["train_range"],
                "validation_range": meta["validation_range"],
                "test_range": meta["test_range"],
                "threshold": RISK_RUNTIME.folds[fold]["threshold"],
                "calibrated": False,
            }
            for fold, meta in RISK_RUNTIME.metadata["folds"].items()
        },
        "limitations": [
            "validation ไม่มี positive ทั้งสอง fold จึงไม่ได้ calibrate score",
            "แต่ละเกาะมีเหตุการณ์ข้าม DHW 4 เพียงครั้งเดียว",
            "MMM เป็นค่าที่ปรับจากข้อมูลทั้งชุด ไม่ใช่ NOAA climatology ที่เป็นอิสระ",
            "score ใช้จัดลำดับความเสี่ยง ไม่ควรตีความเป็นเปอร์เซ็นต์ความน่าจะเป็น",
        ],
    }


@app.get("/risk")
def risk(island: Literal["phi_phi", "man_nai"], as_of: Optional[date] = None):
    RISK_RUNTIME.require_ready()
    df = RISK_RUNTIME.data[island]
    latest_date = pd.Timestamp(df["date"].iloc[-1]).date()
    requested_date = as_of or latest_date
    if requested_date > latest_date:
        raise HTTPException(422, f"as_of ต้องไม่เกินวันที่ข้อมูลล่าสุด {latest_date}")

    history = RISK_RUNTIME.historical_windows[island]
    history_item = history.get(str(requested_date))
    if history_item is not None:
        X = history_item["X"]
        actual = {
            "available": True,
            "date": history_item["target_date"],
            "dhw": history_item["target_dhw"],
            "reached_dhw_4": history_item["target_label"],
        }
    else:
        try:
            X, end = make_inference_window(df, requested_date, feature_columns())
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        if requested_date <= latest_date - timedelta(days=MODEL_HORIZON):
            raise HTTPException(422, "ไม่สามารถสร้าง Time Machine window ได้ เพราะช่วง input หรือ t+7 ข้ามช่องว่างวันที่")
        actual = {"available": False, "date": None, "dhw": None, "reached_dhw_4": None}

    try:
        _, end = make_inference_window(df, requested_date, feature_columns())
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    current = df.iloc[end]
    previous = df.iloc[end - 7]
    if current["date"] - previous["date"] != pd.Timedelta(days=7):
        raise HTTPException(422, "ข้อมูล DHW ย้อนหลัง 7 วันข้ามช่องว่างวันที่")

    fold_id = ISLAND_MODEL_FOLD[island]
    fold = RISK_RUNTIME.folds[fold_id]
    scaled = scale_windows(X, fold["scaler"])
    seed_scores = [
        {"seed": seed, "score": float(model.predict(scaled, verbose=0).reshape(-1)[0])}
        for seed, model in fold["models"]
    ]
    score = float(np.mean([item["score"] for item in seed_scores]))
    threshold = float(fold["threshold"])
    rule_alert = bool(current["dhw"] >= RULE_DHW and current["dhw"] > previous["dhw"])
    hotspot = float(current["hotspot"])
    noaa_level = classify_dhw(float(current["dhw"]), hotspot)
    age_days = max(0, (date.today() - latest_date).days)
    return {
        "island": island,
        "fold": fold_id,
        "as_of": str(requested_date),
        "earliest_as_of": min(history),
        "latest_data_date": str(latest_date),
        "data_age_days": age_days,
        "stale": age_days > 14,
        "ai_risk_score": score,
        "seed_scores": seed_scores,
        "threshold": threshold,
        "risk_level": "high" if score >= threshold else "low",
        "risk_level_th": "สูง" if score >= threshold else "ต่ำ",
        "baseline_rule": {
            "name": "DHW >= 3 and rising",
            "alert": rule_alert,
            "dhw_now": float(current["dhw"]),
            "dhw_7d_ago": float(previous["dhw"]),
        },
        "noaa_current": {
            "dhw": float(current["dhw"]), "hotspot_c": hotspot,
            "level": noaa_level, "level_th": NOAA_LEVEL_TH[noaa_level],
        },
        "actual_t_plus_7": actual,
        "note": "Uncalibrated AI risk score; ไม่ใช่เปอร์เซ็นต์ความน่าจะเป็น",
    }


@app.get("/config")
def get_config():
    return {
        "alert_standard": "NOAA Coral Reef Watch Bleaching Alert Area (simplified through Level 2)",
        "noaa_reference": "https://coralreefwatch.noaa.gov/product/5km/methodology.php",
        "hotspot_accumulation_min_c": NOAA_HOTSPOT_THRESHOLD_C,
        "dhw_thresholds": {
            "alert_level_1": NOAA_ALERT_LEVEL_1_DHW,
            "alert_level_2": NOAA_ALERT_LEVEL_2_DHW,
        },
        "levels": NOAA_LEVEL_TH,
        "anomaly_thresholds_custom": {
            "watch": ANOM_WATCH,
            "warning": ANOM_WARNING,
            "critical": ANOM_CRITICAL,
            "is_noaa_standard": False,
        },
        "dhw_window_days": 84,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict_bleaching(req: PredictionRequest):
    if req.dhw is not None:
        rising = None if req.dhw_7d_ago is None else req.dhw > req.dhw_7d_ago
        method = "noaa_hotspot_dhw"
        score, unit = req.dhw, "DHW (C-weeks)"
        level = classify_dhw(req.dhw, req.hotspot)
        th = {
            "hotspot_min_c": NOAA_HOTSPOT_THRESHOLD_C,
            "alert_level_1": NOAA_ALERT_LEVEL_1_DHW,
            "alert_level_2": NOAA_ALERT_LEVEL_2_DHW,
        }
        note = "จัดระดับด้วย HotSpot ปัจจุบันและ DHW ตาม NOAA CRW (ชุดย่อถึง Alert Level 2)"
        level_th = NOAA_LEVEL_TH[level]
    else:
        method, rising, unit = "anomaly_mean_30d_custom", None, "C (mean anomaly 30d)"
        score = sum(req.sst_anomaly) / WINDOW
        level = classify_anom(score)
        th = {"watch": ANOM_WATCH, "warning": ANOM_WARNING, "critical": ANOM_CRITICAL}
        note = "เกณฑ์ SST anomaly 30 วันเป็นเกณฑ์ทดลองของ SeaGuard ไม่ใช่มาตรฐาน NOAA CRW"
        level_th = ANOMALY_LEVEL_TH[level]
    return PredictionResponse(
        method=method, score=round(score, 3), unit=unit, rising=rising,
        level=level, level_th=level_th, horizon_days=HORIZON_DAYS,
        thresholds=th, note=note,
    )


# =====================================================================
# สถานการณ์จำลองสำหรับหน้าเว็บ: เลือกเกาะ + อุณหภูมิสมมติ -> DHW ที่คาดว่าจะได้
# ใช้ island_state.json (สร้างจากโน้ตบุ๊ก) : MMM, SST 84 วันล่าสุด, DHW จริงล่าสุด
# เป็นการคำนวณตามสูตร ไม่ใช่การพยากรณ์ และไม่ได้จำลองส่วนที่หลุดออกจากหน้าต่าง 84 วัน
# =====================================================================
STATE_FILE = Path(os.getenv("ISLAND_STATE", str(BASE_DIR / "island_state.json"))).resolve()
ISLAND_TH = {"phi_phi": "เกาะพีพี", "man_nai": "เกาะมันใน"}


def load_state() -> dict:
    if not STATE_FILE.exists():
        raise HTTPException(503, f"ไม่พบ {STATE_FILE} (สร้างจากโน้ตบุ๊กก่อน)")
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(503, "ไม่สามารถอ่านข้อมูลสถานะเกาะได้") from exc
    if not isinstance(state, dict):
        raise HTTPException(503, "รูปแบบข้อมูลสถานะเกาะไม่ถูกต้อง")
    return state


def dhw_last(sst: List[float], mmm: float) -> float:
    """DHW ของวันสุดท้าย = ผลรม HotSpot (>=1C) ใน 84 วันล่าสุด / 7"""
    return sum(s - mmm for s in sst[-84:] if s - mmm >= 1.0) / 7.0


class SimulateRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)

    island: Literal["phi_phi", "man_nai"]
    sst_value: float = Field(..., ge=24, le=36, description="SST สมมติ (C) คงที่ตลอดช่วงจำลอง")
    days: int = Field(7, ge=1, le=28, description="จำนวนวันที่ถือ SST นี้ (ค่าเริ่มต้น 7)")


class SimulateResponse(BaseModel):
    island: str
    island_th: str
    sst_value: float
    days: int
    mmm_c: float
    state_date: Optional[str]
    dhw_now: float
    dhw_projected: float
    rising: bool
    hotspot_c: float
    level: Literal["no_stress", "watch", "warning", "alert_level_1", "alert_level_2"]
    level_th: str
    fit_gap: float
    note: str
    # --- เพิ่ม 3 ตัวนี้เพื่อใช้วาดกราฟ ---
    dates: List[str]
    sst_forecast: List[float]
    dhw_forecast: List[float]

@app.get("/islands")
def islands():
    st = load_state()
    out = {}
    for k, v in st.items():
        out[k] = {
            "name_th": ISLAND_TH.get(k, k),
            "mmm_c": v["mmm"],
            "mmm_source": v.get("mmm_source", "unknown"),
            "dhw_now": v["dhw_now"],
            "sst_last": v["sst_last84"][-1],
            "state_date": v.get("date_last"),
            "slider_min_c": round(v["mmm"] - 1.5, 1),   # ช่วงแนะนำสำหรับแถบเลื่อน
            "slider_max_c": round(v["mmm"] + 3.0, 1),
        }
    return out


@app.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    st = load_state()
    if req.island not in st:
        raise HTTPException(404, "ไม่พบข้อมูลเกาะนี้")
    s = st[req.island]
    hist, mmm = s["sst_last84"], s["mmm"]
    est_now = dhw_last(hist, mmm)
    est_future = dhw_last(hist + [req.sst_value] * req.days, mmm)
    delta = est_future - est_now
    projected = max(0.0, s["dhw_now"] + delta)
    rising = delta > 0
    hotspot = req.sst_value - mmm
    level = classify_dhw(projected, hotspot)
    gap = round(est_now - s["dhw_now"], 2)

    # ----------------------------------------------------
    # คำนวณข้อมูล 7 วัน (หรือตาม req.days) สำหรับวาดกราฟ
    # ----------------------------------------------------
    thai_months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
    base_date = datetime.strptime(s.get("date_last", "2026-09-30"), "%Y-%m-%d") if s.get("date_last") else datetime.now()

    dates = []
    sst_forecast = []
    dhw_forecast = []

    for i in range(req.days):
        day_date = base_date + timedelta(days=i + 1)
        dates.append(f"{day_date.day} {thai_months[day_date.month - 1]}")
        
        # SST คงที่ตาม req.sst_value
        sst_forecast.append(round(req.sst_value, 2))
        
        # คำนวณ DHW สะสมเพิ่มขึ้นทีละวันจาก dhw_now ไปยัง projected
        daily_dhw = dhw_last(hist + [req.sst_value] * (i + 1), mmm)
        daily_delta = daily_dhw - est_now
        dhw_forecast.append(round(max(0.0, s["dhw_now"] + daily_delta), 3))

    note = ("เป็นสถานการณ์จำลองตามสูตร DHW ไม่ใช่การพยากรณ์ และเป็นดัชนีความเครียดความร้อน "
            "ไม่ใช่การยืนยันการฟอกขาวจริง")
    if abs(gap) >= 0.5:
        note += f"; สูตรจาก SST ให้ DHW ปัจจุบันต่างจากค่าจริง {gap:+.2f} จึงใช้ค่าจริงเป็นจุดเริ่มต้น"
    return SimulateResponse(
        island=req.island, island_th=ISLAND_TH[req.island], sst_value=req.sst_value,
        days=req.days, mmm_c=mmm, state_date=s.get("date_last"),
        dhw_now=round(s["dhw_now"], 2), dhw_projected=round(projected, 2),
        rising=rising, hotspot_c=round(hotspot, 2), level=level,
        level_th=NOAA_LEVEL_TH[level], fit_gap=gap, note=note,
        dates=dates, sst_forecast=sst_forecast, dhw_forecast=dhw_forecast
    )


# เสิร์ฟเฉพาะไฟล์หน้าเว็บที่จำเป็น ไม่เปิดเผย source, CSV หรือโมเดลทั้งโฟลเดอร์
WEB_FILES = {"index.html", "KohMunNai.html", "PhiPhiIslands.html", "style.css", "my-chart.js", "risk.js", "script.js", "i18n.js"}


@app.get("/", include_in_schema=False)
def web_index():
    return FileResponse(BASE_DIR / "index.html", headers={"Cache-Control": "no-store"})


@app.get("/{filename}", include_in_schema=False)
def web_file(filename: str):
    if filename not in WEB_FILES:
        raise HTTPException(404, "ไม่พบไฟล์")
    return FileResponse(BASE_DIR / filename, headers={"Cache-Control": "no-store"})


app.mount("/photo", StaticFiles(directory=BASE_DIR / "photo"), name="photo")

import math
import sys
import unittest
from datetime import date
from pathlib import Path

import numpy as np

PROJECT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_DIR))

import app  # noqa: E402


class ApiLogicTests(unittest.TestCase):
    def test_simulate_route_is_unique_and_returns_chart_series(self):
        routes = [route for route in app.app.routes if getattr(route, "path", None) == "/simulate"]
        self.assertEqual(len(routes), 1)

        request = app.SimulateRequest(island="phi_phi", sst_value=31.0, days=7)
        response = routes[0].endpoint(request)

        self.assertEqual(len(response.dates), 7)
        self.assertEqual(len(response.sst_forecast), 7)
        self.assertEqual(len(response.dhw_forecast), 7)
        self.assertEqual(response.dates[0].split()[0], "15")

    def test_non_finite_input_is_rejected(self):
        with self.assertRaises(ValueError):
            app.PredictionRequest(dhw=math.inf, hotspot=1.0)

    def test_noaa_dhw_boundaries(self):
        self.assertEqual(app.classify_dhw(3.99, hotspot=1.0), "warning")
        self.assertEqual(app.classify_dhw(4.0, hotspot=1.0), "alert_level_1")
        self.assertEqual(app.classify_dhw(7.99, hotspot=1.0), "alert_level_1")
        self.assertEqual(app.classify_dhw(8.0, hotspot=1.0), "alert_level_2")

    def test_noaa_hotspot_is_required_for_alert_levels(self):
        self.assertEqual(app.classify_dhw(8.0, hotspot=0.99), "watch")
        self.assertEqual(app.classify_dhw(8.0, hotspot=0.0), "no_stress")

    def test_state_path_is_independent_of_working_directory(self):
        self.assertTrue(app.STATE_FILE.is_absolute())
        self.assertTrue(app.STATE_FILE.exists())

    def test_config_exposes_single_source_of_alert_thresholds(self):
        config = app.get_config()
        self.assertEqual(config["hotspot_accumulation_min_c"], 1.0)
        self.assertEqual(config["dhw_thresholds"]["alert_level_1"], 4.0)
        self.assertEqual(config["dhw_thresholds"]["alert_level_2"], 8.0)
        self.assertFalse(config["anomaly_thresholds_custom"]["is_noaa_standard"])

    def test_static_routes_do_not_expose_source_files(self):
        self.assertTrue(str(app.web_index().path).endswith("index.html"))
        self.assertTrue(str(app.web_file("KohMunNai.html").path).endswith("KohMunNai.html"))
        self.assertTrue(str(app.web_file("i18n.js").path).endswith("i18n.js"))
        with self.assertRaises(app.HTTPException):
            app.web_file("app.py")

    def test_risk_runtime_and_fold_mapping(self):
        self.assertIsNone(app.RISK_RUNTIME.error)
        for island, expected_fold in (("phi_phi", "FoldA"), ("man_nai", "FoldB")):
            result = app.risk(island)
            self.assertEqual(result["fold"], expected_fold)
            self.assertGreaterEqual(result["ai_risk_score"], 0.0)
            self.assertLessEqual(result["ai_risk_score"], 1.0)
            self.assertEqual(len(result["seed_scores"]), 5)

    def test_api_inference_matches_coral_preprocessing(self):
        island = "phi_phi"
        result = app.risk(island)
        df = app.RISK_RUNTIME.data[island]
        X, _ = app.make_inference_window(df, result["as_of"], app.feature_columns())
        fold = app.RISK_RUNTIME.folds[result["fold"]]
        scaled = app.scale_windows(X, fold["scaler"])
        direct_scores = [
            float(model.predict(scaled, verbose=0).reshape(-1)[0])
            for _, model in fold["models"]
        ]
        self.assertEqual([item["score"] for item in result["seed_scores"]], direct_scores)
        self.assertEqual(result["ai_risk_score"], float(np.mean(direct_scores)))

    def test_time_machine_returns_actual_t_plus_7(self):
        result = app.risk("phi_phi", date(2024, 5, 1))
        self.assertTrue(result["actual_t_plus_7"]["available"])
        self.assertEqual(result["actual_t_plus_7"]["date"], "2024-05-08")
        self.assertTrue(result["actual_t_plus_7"]["reached_dhw_4"])

    def test_time_machine_rejects_window_crossing_date_gap(self):
        with self.assertRaises(app.HTTPException) as ctx:
            app.risk("phi_phi", date(2025, 1, 10))
        self.assertEqual(ctx.exception.status_code, 422)
        self.assertIn("ข้ามช่องว่าง", ctx.exception.detail)

    def test_model_info_documents_uncalibrated_limitations(self):
        info = app.model_info()
        self.assertFalse(info["folds"]["FoldA"]["calibrated"])
        self.assertFalse(info["folds"]["FoldB"]["calibrated"])
        self.assertEqual(info["folds"]["FoldA"]["threshold"], 0.5)
        self.assertIn("validation ไม่มี positive ทั้งสอง fold จึงไม่ได้ calibrate score", info["limitations"])


if __name__ == "__main__":
    unittest.main()

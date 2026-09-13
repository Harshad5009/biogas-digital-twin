"""
test_twin.py — Unit tests for Digital Twin state updates, anomaly detection, and health score.
"""

import unittest
from app.digital_twin.twin import DigitalTwin
from app.analytics.anomaly import detect_anomaly, rule_based_check, trend_based_check
from app.analytics.health import calculate_health_score
from app.analytics.prediction import predict_gas_production, predict_temperature
from app.simulation.what_if import run_what_if


class TestDigitalTwin(unittest.TestCase):

    def setUp(self):
        self.twin = DigitalTwin()

    def test_twin_normal_update(self):
        reading = {
            "device_id": "digester01",
            "temperature": 32.5,
            "humidity": 62.0,
            "mq5": 380.0,
            "mq2": 320.0,
            "methane": 58.0,
            "gas_production": 2.5,
            "source": "SIMULATION",
        }
        state = self.twin.update(reading)
        self.assertEqual(state["temperature"], 32.5)
        self.assertEqual(state["status"], "HEALTHY")
        self.assertFalse(state["anomaly_detected"])
        self.assertGreaterEqual(state["health_score"], 80)

    def test_twin_temperature_drop_degradation(self):
        # Simulate gradual temperature drop
        temps = [32.0, 30.0, 28.0, 25.0, 22.0, 20.0, 18.0]
        for t in temps:
            self.twin.update({
                "temperature": t,
                "humidity": 60.0,
                "mq5": 350.0,
                "mq2": 300.0,
                "methane": 40.0,
                "gas_production": 0.8,
                "source": "SIMULATION",
            })
        self.assertIn(self.twin.status, ["DEGRADING", "CRITICAL"])
        self.assertLess(self.twin.health_score, 75.0)

    def test_rule_based_anomaly_detection(self):
        # Low temperature anomaly
        anomaly, reasons = rule_based_check(
            temperature=15.0, humidity=60.0, mq5=300.0, mq2=250.0, gas_production=2.0
        )
        self.assertTrue(anomaly)
        self.assertTrue(any("too low" in r.lower() for r in reasons))

        # Sudden spike anomaly
        anomaly_spike, reasons_spike = rule_based_check(
            temperature=32.0, humidity=60.0, mq5=800.0, mq2=250.0, gas_production=2.0,
            prev_mq5=300.0
        )
        self.assertTrue(anomaly_spike)
        self.assertTrue(any("mq-5" in r.lower() for r in reasons_spike))

    def test_health_score_calculation(self):
        res = calculate_health_score(
            temperature=33.0,
            humidity=65.0,
            gas_production=2.6,
            methane=60.0,
            recent_gas_production=[2.5, 2.55, 2.6, 2.62],
            recent_temperature=[32.8, 32.9, 33.0],
            anomaly_detected=False
        )
        self.assertGreaterEqual(res["score"], 85.0)
        self.assertEqual(res["status"], "HEALTHY")
        self.assertEqual(len(res["factors"]), 4)

    def test_prediction_model(self):
        # Linear progression
        history = [2.0, 2.1, 2.2, 2.3, 2.4, 2.5]
        pred = predict_gas_production(history, steps_ahead=6)
        self.assertEqual(pred["trend"], "INCREASING")
        self.assertGreater(pred["predicted_value"], 2.5)
        self.assertIn("SIMULATION DATA", pred["data_note"])

    def test_what_if_simulation(self):
        res = run_what_if(temperature=22.0, humidity=50.0, duration_hours=6.0)
        self.assertIn("WHAT-IF SIMULATION", res["disclaimer"])
        self.assertLess(res["predicted_gas_production"], 2.0)
        self.assertIn(res["predicted_status"], ["DEGRADING", "CRITICAL"])

    def test_what_if_mq2_override(self):
        # Baseline gas production
        res_baseline = run_what_if(temperature=32.0, humidity=62.0, mq5_override=380.0, mq2_override=320.0)
        # Higher MQ-2 override raises the combined gas indicator and production
        res_high_mq2 = run_what_if(temperature=32.0, humidity=62.0, mq5_override=380.0, mq2_override=500.0)
        self.assertGreater(res_high_mq2["gas_indicator"], res_baseline["gas_indicator"])
        self.assertGreater(res_high_mq2["predicted_gas_production"], res_baseline["predicted_gas_production"])
        self.assertEqual(res_high_mq2["input_mq2"], 500.0)


if __name__ == "__main__":
    unittest.main()

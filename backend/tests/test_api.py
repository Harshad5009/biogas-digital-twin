"""
test_api.py — Integration tests for FastAPI endpoints.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app
from app.database.database import init_db


class TestAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "running")

    def test_system_status(self):
        res = self.client.get("/api/system/status")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["backend"], "ONLINE")

    def test_digital_twin_state(self):
        res = self.client.get("/api/twin/state")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("health_score", data)
        self.assertIn("status", data)

    def test_what_if_endpoint(self):
        res = self.client.post("/api/simulation/what-if", json={
            "temperature": 26.0,
            "humidity": 65.0,
            "duration_hours": 6.0
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("WHAT-IF SIMULATION", data["disclaimer"])
        self.assertIn("predicted_gas_production", data)

    def test_simulation_start_endpoint(self):
        res = self.client.post("/api/simulation/start", json={"scenario": "temp_drop"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["scenario"], "temp_drop")

    def test_predictions_endpoint(self):
        res = self.client.get("/api/predictions/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("disclaimer", res.json())

    def test_esp8266_ingest(self):
        payload = {
            "device_id": "digester01",
            "temperature": 31.4,
            "humidity": 63.0,
            "mq5": 421.0,
            "mq2": 317.0,
            "methane": None,
            "gas_production": None,
            "source": "ESP8266"
        }
        res = self.client.post("/api/sensors/ingest", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        # Verify twin state updated with ESP8266 source
        res_twin = self.client.get("/api/twin/state")
        self.assertEqual(res_twin.status_code, 200)
        data = res_twin.json()
        self.assertEqual(data["data_source"], "ESP8266")
        self.assertEqual(data["temperature"], 31.4)
        self.assertEqual(data["mq2"], 317.0)


if __name__ == "__main__":
    unittest.main()

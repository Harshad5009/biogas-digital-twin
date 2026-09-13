"""
test_simulation.py — Tests for the 5 simulation scenarios.
"""

import unittest
from app.simulation.simulator import ScenarioSimulator


class TestSimulationEngine(unittest.TestCase):

    def setUp(self):
        self.sim = ScenarioSimulator()

    def test_normal_scenario(self):
        self.sim.set_scenario("normal")
        readings = [self.sim.next_reading() for _ in range(10)]
        for r in readings:
            self.assertEqual(r["source"], "SIMULATION")
            self.assertTrue(28.0 <= r["temperature"] <= 36.0)
            self.assertTrue(1.8 <= r["gas_production"] <= 3.2)
            self.assertIn("mq2", r)
            self.assertTrue(200.0 <= r["mq2"] <= 450.0)

    def test_temperature_drop_scenario(self):
        self.sim.set_scenario("temp_drop")
        readings = [self.sim.next_reading() for _ in range(25)]
        first_temp = readings[0]["temperature"]
        last_temp = readings[-1]["temperature"]
        self.assertLess(last_temp, first_temp)
        self.assertLess(readings[-1]["gas_production"], readings[0]["gas_production"])

    def test_sudden_spike_scenario(self):
        self.sim.set_scenario("sudden_spike")
        readings = [self.sim.next_reading() for _ in range(10)]
        mq_vals = [r["mq5"] for r in readings]
        max_mq = max(mq_vals)
        self.assertGreater(max_mq, 600.0)

    def test_recovery_scenario(self):
        self.sim.set_scenario("recovery")
        readings = [self.sim.next_reading() for _ in range(20)]
        last = readings[-1]
        self.assertTrue(28.0 <= last["temperature"] <= 35.0)


if __name__ == "__main__":
    unittest.main()

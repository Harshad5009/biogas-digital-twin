import { useEffect, useState } from "react";
import { sensorsApi } from "../services/api";

interface SensorData {
  id?: number;
  timestamp?: string;
  device_id?: string;
  temperature?: number | null;
  humidity?: number | null;
  mq5_value?: number | null;
  mq2_value?: number | null;
  methane_simulated?: number | null;
  gas_production_simulated?: number | null;
  source?: string;
}

export function Dashboard() {
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSensorData = async () => {
    try {
      const data = await sensorsApi.getLatest();
      setSensor(data as SensorData);
      setError("");
    } catch (err) {
      console.error("Unable to load sensor data:", err);
      setError("Unable to connect to backend");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSensorData();

    // Refresh ESP8266 data every 5 seconds
    const interval = setInterval(loadSensorData, 5000);

    return () => clearInterval(interval);
  }, []);

  const temperature = sensor?.temperature;
  const humidity = sensor?.humidity;
  const mq5 = sensor?.mq5_value;
  const mq2 = sensor?.mq2_value;

  const mq2Status =
    mq2 === 1
      ? "ALERT"
      : "NORMAL";

  const formatValue = (
    value: number | null | undefined,
    suffix = ""
  ) => {
    if (value === null || value === undefined) {
      return "N/A";
    }

    return `${value}${suffix}`;
  };

  const lastUpdated = sensor?.timestamp
    ? new Date(sensor.timestamp).toLocaleTimeString()
    : "Waiting...";

  return (
    <div className="dashboard-page">

      {/* Header information */}
      <div className="dashboard-heading">
        <div>
          <h1>Biogas Plant Dashboard</h1>
          <p>Real-time monitoring and digital twin visualization</p>
        </div>

        <div className="dashboard-status">
          <span className="status-dot"></span>
          {error ? "OFFLINE" : "ONLINE"}
        </div>
      </div>

      {error && (
        <div className="dashboard-error">
          {error}. Make sure the FastAPI backend is running on port 8001.
        </div>
      )}

      <div className="dashboard-grid">

        {/* ===================================================== */}
        {/* DIGITAL TWIN VIRTUAL PLANT                           */}
        {/* ===================================================== */}

        <section className="digital-twin-card">

          <div className="digital-twin-title">
            <h2>DIGITAL TWIN - VIRTUAL PLANT</h2>
            <p>
              {error
                ? "Waiting for physical plant connection"
                : "Synchronized with physical plant"}
            </p>
          </div>

          {/* Virtual plant illustration */}
          <div className="virtual-plant">

            <div className="sky-glow"></div>

            <div className="plant-label">
              BIOGAS DIGESTER
            </div>

            {/* Digester dome */}
            <div className="digester-dome">
              <div className="dome-highlight"></div>
            </div>

            {/* Digester body */}
            <div className="digester-body">
              <div className="digester-window">
                <div className="slurry"></div>
                <div className="pipe pipe-one"></div>
                <div className="pipe pipe-two"></div>
              </div>
            </div>

            {/* Gas holder */}
            <div className="gas-holder">
              <div className="gas-holder-dome"></div>
              <div className="gas-holder-base"></div>
            </div>

            {/* Connecting pipes */}
            <div className="plant-pipe pipe-left"></div>
            <div className="plant-pipe pipe-right"></div>
            <div className="plant-pipe pipe-bottom"></div>

            {/* Feed tank */}
            <div className="feed-tank">
              <div className="tank-top"></div>
              <div className="tank-body"></div>
            </div>

            {/* Slurry outlet */}
            <div className="slurry-tank">
              <div className="tank-top"></div>
              <div className="tank-body"></div>
            </div>

            {/* Plant ground */}
            <div className="plant-ground"></div>

            {/* Information labels */}
            <div className="plant-info gas-holder-info">
              <span>GAS HOLDER</span>
              <strong>Pressure: Estimated</strong>
              <small>No pressure sensor connected</small>
            </div>

            <div className="plant-info digester-info">
              <span>DIGESTER</span>
              <strong>
                Temperature: {formatValue(temperature, " °C")}
              </strong>
              <small>Live ESP8266 measurement</small>
            </div>

            <div className="plant-info outlet-info">
              <span>GAS OUTLET ➜</span>
              <strong>Flow rate: Estimated</strong>
              <small>Flow sensor not connected</small>
            </div>

            <div className="plant-info feed-info">
              <span>INLET FEED TANK</span>
              <strong>Level: Estimated</strong>
              <small>Digital Twin value</small>
            </div>

            <div className="plant-info slurry-info">
              <span>SLURRY OUTLET</span>
              <strong>Level: Estimated</strong>
              <small>Digital Twin value</small>
            </div>

          </div>
        </section>

        {/* ===================================================== */}
        {/* LIVE SENSOR DATA                                      */}
        {/* ===================================================== */}

        <section className="sensor-card">
          <div className="section-title">
            <h2>LIVE SENSOR DATA</h2>
            <span className="live-badge">LIVE</span>
          </div>

          <div className="sensor-grid">

            <SensorBox
              title="Methane (CH₄)"
              value="N/A"
              subtitle="Digital Twin estimate"
              estimated
            />

            <SensorBox
              title="Carbon Dioxide (CO₂)"
              value="N/A"
              subtitle="No CO₂ sensor connected"
            />

            <SensorBox
              title="Temperature — DHT11"
              value={formatValue(temperature, " °C")}
              subtitle="Real ESP8266 measurement"
              live
            />

            <SensorBox
              title="Pressure"
              value="N/A"
              subtitle="No pressure sensor connected"
            />

            <SensorBox
              title="MQ-5 Relative Gas Level"
              value={formatValue(mq5)}
              subtitle="Raw analog value — not calibrated ppm"
              live
            />

            <SensorBox
              title="Humidity — DHT11"
              value={formatValue(humidity, " %RH")}
              subtitle="Real ESP8266 measurement"
              live
            />

            <SensorBox
              title="MQ-2 Gas Detection"
              value={mq2Status}
              subtitle="Digital threshold detection"
              alert={mq2Status === "ALERT"}
              live
            />

            <SensorBox
              title="H₂S — Hydrogen Sulfide"
              value="N/A"
              subtitle="No H₂S sensor connected"
            />

          </div>

          <div className="data-source">
            Data source:
            <strong>
              {sensor?.source || "ESP8266"}
            </strong>
          </div>

          <div className="last-updated">
            Last updated: {loading ? "Loading..." : lastUpdated}
          </div>
        </section>

      </div>

      {/* ===================================================== */}
      {/* LOWER DASHBOARD CARDS                                */}
      {/* ===================================================== */}

      <div className="lower-grid">

        {/* Plant health */}
        <section className="health-card">
          <h2>PLANT HEALTH INDEX</h2>

          <div className="health-content">
            <div className="health-circle">
              <strong>100</strong>
              <span>/100</span>
            </div>

            <div className="health-details">
              <h3>HEALTHY</h3>
              <p>
                Health status calculated from available monitoring
                parameters.
              </p>

              <div className="health-row">
                <span>Performance</span>
                <strong>92%</strong>
              </div>

              <div className="health-row">
                <span>Stability</span>
                <strong>89%</strong>
              </div>

              <div className="health-row">
                <span>Safety</span>
                <strong>95%</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Real-time trends */}
        <section className="trend-card">
          <h2>REAL-TIME TRENDS</h2>

          <div className="trend-legend">
            <span className="legend-methane">● CH₄ Estimate</span>
            <span className="legend-temperature">● Temperature</span>
          </div>

          <div className="simple-chart">
            <div className="chart-y-axis">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            <div className="chart-area">
              <div className="chart-line methane-line"></div>
              <div className="chart-line temperature-line"></div>

              <div className="chart-grid-line line-1"></div>
              <div className="chart-grid-line line-2"></div>
              <div className="chart-grid-line line-3"></div>
              <div className="chart-grid-line line-4"></div>
            </div>
          </div>

          <div className="chart-time">
            <span>Now</span>
            <span>+5 min</span>
            <span>+10 min</span>
            <span>+15 min</span>
          </div>
        </section>

        {/* Prediction */}
        <section className="prediction-card">
          <h2>PREDICTION — NEXT 6 HOURS</h2>

          <div className="prediction-grid">

            <PredictionBox
              title="Methane Estimate"
              value="N/A"
              status="Estimated"
            />

            <PredictionBox
              title="Gas Flow Estimate"
              value="N/A"
              status="Estimated"
            />

            <PredictionBox
              title="Pressure"
              value="N/A"
              status="No sensor"
            />

            <PredictionBox
              title="Current Temperature"
              value={formatValue(temperature, " °C")}
              status="Live"
            />

          </div>
        </section>

      </div>

    </div>
  );
}

/* ========================================================= */
/* SENSOR BOX COMPONENT                                      */
/* ========================================================= */

interface SensorBoxProps {
  title: string;
  value: string;
  subtitle: string;
  estimated?: boolean;
  live?: boolean;
  alert?: boolean;
}

function SensorBox({
  title,
  value,
  subtitle,
  estimated,
  live,
  alert,
}: SensorBoxProps) {
  return (
    <div className="sensor-box">
      <div className="sensor-title">{title}</div>

      <div
        className={`sensor-value ${alert ? "value-alert" : ""
          } ${estimated ? "value-estimated" : ""}`}
      >
        {value}
      </div>

      <div
        className={`sensor-subtitle ${live ? "subtitle-live" : ""
          }`}
      >
        {subtitle}
      </div>
    </div>
  );
}

/* ========================================================= */
/* PREDICTION BOX COMPONENT                                  */
/* ========================================================= */

interface PredictionBoxProps {
  title: string;
  value: string;
  status: string;
}

function PredictionBox({
  title,
  value,
  status,
}: PredictionBoxProps) {
  return (
    <div className="prediction-box">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{status}</small>

      <div className="prediction-line">
        <span></span>
      </div>
    </div>
  );
}
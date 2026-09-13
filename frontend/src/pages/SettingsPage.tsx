// pages/SettingsPage.tsx — System settings, MQTT configuration, and manual controls
import React, { useEffect, useState } from 'react';
import { systemApi, simulationApi } from '../services/api';
import type { SystemStatus, TwinState } from '../types';
import { RefreshCw, Play, ShieldAlert, Cpu, Server } from 'lucide-react';

interface Props {
  twinState: TwinState | null;
  connected: boolean;
}

export const SettingsPage: React.FC<Props> = ({ twinState: ts, connected }) => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [simScenario, setSimScenario] = useState('normal');
  const [activeScenarioMsg, setActiveScenarioMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchStatus = () => {
    systemApi.getStatus().then((d: unknown) => setStatus(d as SystemStatus)).catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
  }, [ts?.update_count]);

  const switchScenario = async (sc: string) => {
    setLoading(true);
    try {
      const res = await simulationApi.start(sc) as { message: string };
      setSimScenario(sc);
      setActiveScenarioMsg(res.message);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}><span className="gradient-text">System Settings & Controls</span></h1>
        <button className="btn-outline" onClick={fetchStatus} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <RefreshCw size={14} /> Refresh Status
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* System Health Overview */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            <Server size={16} color="#00c896" /> BACKEND & SERVICES STATUS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { label: 'FastAPI Backend', val: status?.backend ?? 'ONLINE', ok: true },
              { label: 'WebSocket Connection', val: connected ? 'CONNECTED' : 'DISCONNECTED', ok: connected },
              { label: 'SQLite Database', val: status?.database_ok ? 'CONNECTED & READ/WRITE' : 'ERROR', ok: !!status?.database_ok },
              { label: 'MQTT Broker Client', val: status?.mqtt_connected ? 'CONNECTED (Port 1883)' : 'STANDBY / LOCAL SIMULATION', ok: !!status?.mqtt_connected },
              { label: 'Simulation Engine', val: status?.simulation_active ? 'ACTIVE' : 'IDLE', ok: !!status?.simulation_active },
              { label: 'Active Data Pipeline', val: status?.data_source ?? (ts?.data_source ?? 'SIMULATION'), ok: true },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.04)'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{item.label}</span>
                <span className={`status-badge ${item.ok ? 'badge-healthy' : 'badge-degrading'}`} style={{ fontSize: '0.68rem' }}>
                  {item.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Scenario Trigger Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            <Play size={16} color="#3b82f6" /> SIMULATION SCENARIO CONTROL
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
            Switch the active test scenario for academic evaluation. The simulation loop emits continuous data conforming to ESP8266 schema.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { id: 'normal', name: 'Scenario 1: Normal Operation', desc: 'Optimal mesophilic temp (28-35°C), steady production (~2.5 L/min).' },
              { id: 'temp_drop', name: 'Scenario 2: Temperature Drop', desc: 'Gradual temp decline triggering lower gas yield and degradation state.' },
              { id: 'gas_degradation', name: 'Scenario 3: Gas Trend Degradation', desc: 'Falling gas yield with stable temp (biological inhibition).' },
              { id: 'sudden_spike', name: 'Scenario 4: Sudden Gas Sensor Spike', desc: 'Sudden gas variation triggering Level 1 anomaly alert.' },
              { id: 'recovery', name: 'Scenario 5: Recovery Mode', desc: 'Process parameters return smoothly back to healthy baseline.' },
            ].map(sc => (
              <button
                key={sc.id}
                onClick={() => switchScenario(sc.id)}
                disabled={loading}
                style={{
                  textAlign: 'left', padding: '0.65rem 0.85rem', borderRadius: 8,
                  background: simScenario === sc.id ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.02)',
                  border: simScenario === sc.id ? '1px solid #00c896' : '1px solid rgba(255,255,255,0.06)',
                  color: simScenario === sc.id ? '#00c896' : '#cbd5e1',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{sc.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>{sc.desc}</div>
              </button>
            ))}
          </div>

          {activeScenarioMsg && (
            <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '0.5rem 0.75rem', borderRadius: 6 }}>
              ✓ {activeScenarioMsg}
            </div>
          )}
        </div>
      </div>

      {/* Hardware Configuration Details */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          <Cpu size={16} color="#8b5cf6" /> ESP8266 & MQTT CONFIGURATION REFERENCE
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Sensor Pinout (ESP8266 NodeMCU):</strong><br />
            • DHT11 Data Pin: D5 (GPIO 14)<br />
            • MQ Analog In: A0 (ADC0, 0-1024)<br />
            • I2C OLED (SSD1306): D1 (SCL), D2 (SDA)<br />
            • <em>Note: Single ADC channel (A0) on ESP8266</em>
          </div>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Actuators & Alerts:</strong><br />
            • Active Buzzer: D6 (GPIO 12)<br />
            • Potentiometer: A0 (in Pot Demo Mode)<br />
            • Power: MQ Heaters on 5V / VIN rail
          </div>
          <div>
            <strong style={{ color: '#e2e8f0' }}>MQTT Topics:</strong><br />
            • Sensors: <code style={{ color: '#00c896' }}>biogas/digester01/sensors</code><br />
            • Commands: <code style={{ color: '#3b82f6' }}>biogas/digester01/commands</code><br />
            • Alerts: <code style={{ color: '#ef4444' }}>biogas/digester01/alerts</code>
          </div>
        </div>
      </div>

      {/* Academic Honesty & Disclaimer Banner */}
      <div style={{
        background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: 10, padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <ShieldAlert size={24} color="#60a5fa" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#60a5fa' }}>Academic Integrity Note:</strong> The platform explicitly separates calibrated physical sensor readings from estimated process variables. MQ series sensors operate as relative gas presence indicators unless specialized gas chromatography or calibrated NDIR sensors are integrated.
        </div>
      </div>
    </div>
  );
};

// pages/WhatIfPage.tsx — What-If simulation interactive page
import React, { useState } from 'react';
import { simulationApi } from '../services/api';
import { HealthRing } from '../components/HealthRing';
import type { WhatIfResult, TwinState } from '../types';

interface Props { twinState: TwinState | null; }

export const WhatIfPage: React.FC<Props> = ({ twinState: ts }) => {
  const [temperature, setTemperature] = useState<number>(ts?.temperature ?? 32);
  const [humidity, setHumidity] = useState<number>(ts?.humidity ?? 62);
  const [duration, setDuration] = useState<number>(6);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async () => {
    setLoading(true);
    try {
      const r = await simulationApi.whatIf({ temperature, humidity, duration_hours: duration }) as WhatIfResult;
      setResult(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'HEALTHY' ? '#10b981' : s === 'DEGRADING' ? '#f59e0b' : '#ef4444';

  const SliderRow = ({ label, value, min, max, step, unit, color, onChange }: {
    label: string; value: number; min: number; max: number; step: number;
    unit: string; color: string; onChange: (v: number) => void;
  }) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>{label}</label>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#475569', marginTop: '0.15rem' }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}><span className="gradient-text">What-If Simulation</span></h1>

      {/* Big disclaimer */}
      <div style={{
        background: 'rgba(139,92,246,0.08)', border: '2px solid rgba(139,92,246,0.3)',
        borderRadius: 12, padding: '1rem 1.25rem',
      }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.35rem' }}>
          ⚗️ WHAT-IF SIMULATION — NO PHYSICAL SYSTEM CHANGE
        </div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
          Modify virtual parameters below and see <strong>estimated</strong> effects on the Digital Twin.
          The physical digester (if connected) is <strong>not affected</strong>.
          All outputs are <strong>simulation-based estimates</strong> using a simplified empirical model.
          They do NOT represent calibrated experimental measurements.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Input controls */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            ▸ HYPOTHETICAL INPUT CONDITIONS
          </div>

          {/* Current vs what-if comparison */}
          {ts && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.6rem 0.8rem',
              marginBottom: '1rem', fontSize: '0.78rem', color: '#64748b',
            }}>
              Current state: Temp <strong style={{ color: '#3b82f6' }}>{ts.temperature?.toFixed(1)}°C</strong>,
              Humidity <strong style={{ color: '#06b6d4' }}>{ts.humidity?.toFixed(1)}%</strong>,
              Gas <strong style={{ color: '#00c896' }}>{ts.gas_production?.toFixed(3)} L/min [SIM]</strong>
            </div>
          )}

          <SliderRow label="Hypothetical Temperature" value={temperature}
            min={10} max={55} step={0.5} unit="°C" color="#3b82f6"
            onChange={setTemperature}/>
          <SliderRow label="Hypothetical Humidity" value={humidity}
            min={20} max={95} step={1} unit="%" color="#06b6d4"
            onChange={setHumidity}/>

          {/* Duration */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              Projection Duration
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 6, 12, 24].map(h => (
                <button key={h} onClick={() => setDuration(h)}
                  className={duration === h ? 'btn-primary' : 'btn-outline'}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.82rem' }}>
                  {h}h
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={runSimulation} disabled={loading}
            style={{ width: '100%', padding: '0.7rem', fontSize: '0.9rem' }}>
            {loading ? '⏳ Running simulation...' : '▶ Run What-If Simulation'}
          </button>
        </div>

        {/* Results */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            ▸ PREDICTED OUTCOME [SIMULATION ESTIMATE]
          </div>

          {!result ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: '2rem 1rem', fontSize: '0.85rem', lineHeight: 1.7 }}>
              Adjust the sliders and click<br/><strong style={{ color: '#00c896' }}>Run What-If Simulation</strong><br/>
              to see estimated effects on the Digital Twin.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Status */}
              <div style={{
                background: `${statusColor(result.predicted_status)}10`,
                border: `1px solid ${statusColor(result.predicted_status)}30`,
                borderRadius: 10, padding: '0.75rem',
              }}>
                <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>PREDICTED STATUS</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: statusColor(result.predicted_status) }}>
                  {result.predicted_status}
                </div>
              </div>

              {/* Health ring + metrics */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <HealthRing score={result.predicted_health_score} status={result.predicted_status} size={100}/>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    { label: 'Gas Production', value: `${result.predicted_gas_production.toFixed(3)} L/min`, color: '#00c896' },
                    { label: 'Methane Estimate', value: `${result.predicted_methane.toFixed(2)}%`, color: '#f97316' },
                    { label: 'Health Score', value: `${result.predicted_health_score.toFixed(1)}/100`, color: statusColor(result.predicted_status) },
                  ].map(m => (
                    <div key={m.label}>
                      <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600 }}>{m.label}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.75rem',
                fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6,
              }}>
                {result.summary}
              </div>

              {/* Compare current vs predicted */}
              {ts && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.5rem' }}>
                    <div style={{ color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>CURRENT</div>
                    <div>Gas: <strong style={{ color: '#94a3b8' }}>{ts.gas_production?.toFixed(3)} L/min</strong></div>
                    <div>Health: <strong style={{ color: '#94a3b8' }}>{ts.health_score.toFixed(1)}</strong></div>
                    <div>Status: <strong style={{ color: '#94a3b8' }}>{ts.status}</strong></div>
                  </div>
                  <div style={{ background: 'rgba(0,200,150,0.04)', borderRadius: 8, padding: '0.5rem', border: '1px solid rgba(0,200,150,0.1)' }}>
                    <div style={{ color: '#00c896', fontWeight: 600, marginBottom: '0.25rem' }}>WHAT-IF</div>
                    <div>Gas: <strong style={{ color: '#00c896' }}>{result.predicted_gas_production.toFixed(3)} L/min</strong></div>
                    <div>Health: <strong style={{ color: statusColor(result.predicted_status) }}>{result.predicted_health_score.toFixed(1)}</strong></div>
                    <div>Status: <strong style={{ color: statusColor(result.predicted_status) }}>{result.predicted_status}</strong></div>
                  </div>
                </div>
              )}

              <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#60a5fa' }}>
                📌 {result.data_note}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// pages/DigitalTwinPage.tsx — Full Digital Twin state view
import React from 'react';
import type { TwinState } from '../types';
import { DigestorVisual } from '../components/DigestorVisual';
import { HealthRing } from '../components/HealthRing';
import { twinApi } from '../services/api';
import { useEffect, useState } from 'react';

interface Props { twinState: TwinState | null; }

export const DigitalTwinPage: React.FC<Props> = ({ twinState: propTwin }) => {
  const [activeTwin, setActiveTwin] = useState<TwinState | null>(propTwin);
  const [healthDetail, setHealthDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (propTwin) {
      setActiveTwin(propTwin);
    } else {
      twinApi.getState().then((s) => s && setActiveTwin(s)).catch(() => {});
    }
  }, [propTwin]);

  const ts = activeTwin;

  useEffect(() => {
    twinApi.getHealth().then((d: unknown) => setHealthDetail(d as Record<string, unknown>)).catch(() => {});
  }, [ts?.update_count]);

  if (!ts) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
      <div style={{ display: 'inline-block', width: 28, height: 28, border: '3px solid rgba(0,229,153,0.2)', borderTopColor: '#00e599', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '1rem' }} />
      <div>Synchronizing Digital Twin with plant telemetry...</div>
    </div>
  );

  const factors = (healthDetail?.factors as Array<Record<string, unknown>>) ?? [];

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 1300, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
        <span className="gradient-text">Digital Twin State</span>
      </h1>
      <div className="sim-banner">
        🔷 The Digital Twin is a <strong>virtual model</strong> synchronized with incoming sensor data.
        It is NOT a real physical measurement. Simulated values are clearly labeled.
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* Twin Visual */}
        <div className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '1rem' }}>
            ▸ VIRTUAL DIGESTER REPRESENTATION
          </div>
          <DigestorVisual
            status={ts.status} temperature={ts.temperature}
            gasProduction={ts.gas_production} methane={ts.methane_estimate}
            dataSource={ts.data_source} anomalyDetected={ts.anomaly_detected}
          />
        </div>

        {/* State table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            ▸ CURRENT TWIN STATE
          </div>
          {[
            { label: 'Temperature', value: ts.temperature?.toFixed(2), unit: '°C', note: ts.data_source, color: '#3b82f6' },
            { label: 'Humidity', value: ts.humidity?.toFixed(2), unit: '%', note: ts.data_source, color: '#06b6d4' },
            { label: 'MQ-5 Indicator', value: ts.mq5?.toFixed(0), unit: ' ADC', note: 'Relative', color: '#f59e0b' },
            { label: 'MQ-2 Indicator', value: ts.mq2?.toFixed(0), unit: ' ADC', note: 'Relative', color: '#8b5cf6' },
            { label: 'Gas Indicator', value: ts.gas_indicator?.toFixed(0), unit: ' ADC', note: 'Combined', color: '#94a3b8' },
            { label: 'Methane Estimate', value: ts.methane_estimate?.toFixed(2), unit: '%', note: '⚠ SIMULATION', color: '#f97316' },
            { label: 'Gas Production', value: ts.gas_production?.toFixed(3), unit: ' L/min', note: '⚠ SIMULATION', color: '#00c896' },
            { label: 'Health Score', value: ts.health_score.toFixed(1), unit: '/100', color: ts.status === 'HEALTHY' ? '#10b981' : ts.status === 'DEGRADING' ? '#f59e0b' : '#ef4444' },
            { label: 'Status', value: ts.status, color: ts.status === 'HEALTHY' ? '#10b981' : ts.status === 'DEGRADING' ? '#f59e0b' : '#ef4444' },
            { label: 'Anomaly', value: ts.anomaly_detected ? 'DETECTED' : 'None', color: ts.anomaly_detected ? '#ef4444' : '#10b981' },
            { label: 'Data Source', value: ts.data_source, color: '#60a5fa' },
            { label: 'Updates', value: String(ts.update_count), color: '#64748b' },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.45rem',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{row.label}</div>
                {row.note && <div style={{ fontSize: '0.62rem', color: '#475569' }}>{row.note}</div>}
              </div>
              <div style={{ color: row.color, fontWeight: 700, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' }}>
                {row.value ?? '—'}{row.unit ?? ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Health score breakdown */}
      <div className="card">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '1rem' }}>
          ▸ HEALTH SCORE BREAKDOWN — TRANSPARENT FORMULA
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem', flexWrap: 'wrap' }}>
          <HealthRing score={ts.health_score} status={ts.status} size={120}/>
          <div style={{ flex: 1 }}>
            {factors.map((f, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.2rem' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{f.name as string}</span>
                  <span style={{ color: '#00c896' }}>{(f.score as number).toFixed(1)} / {(f.max as number).toFixed(1)} pts</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${((f.score as number) / (f.max as number)) * 100}%`,
                    background: (f.score as number) / (f.max as number) > 0.6 ? '#10b981' : (f.score as number) / (f.max as number) > 0.35 ? '#f59e0b' : '#ef4444',
                  }}/>
                </div>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.15rem' }}>{f.note as string}</div>
              </div>
            ))}
            {healthDetail && (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', lineHeight: 1.6 }}>
                <strong style={{ color: '#94a3b8' }}>Summary:</strong> {healthDetail.summary as string}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly reasons */}
      {ts.anomaly_detected && ts.anomaly_reason && (
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            ▸ ANOMALY DETAILS
          </div>
          {ts.anomaly_reason.split(';').map((r, i) => (
            <div key={i} style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              ⚠ {r.trim()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

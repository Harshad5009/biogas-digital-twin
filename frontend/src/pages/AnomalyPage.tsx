// pages/AnomalyPage.tsx — Anomaly detection details
import React, { useEffect, useState } from 'react';
import { systemApi } from '../services/api';
import type { Alert, TwinState } from '../types';

interface Props { twinState: TwinState | null; }

export const AnomalyPage: React.FC<Props> = ({ twinState: ts }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = () => {
    systemApi.getAnomalies().then((d: unknown) => setAlerts(d as Alert[])).catch(() => {});
  };

  useEffect(() => { load(); }, [ts?.update_count]);

  const acknowledge = async (id: number) => {
    await systemApi.acknowledge(id);
    load();
  };

  const levelColor = (l: string) =>
    l === 'CRITICAL' ? '#ef4444' : l === 'WARNING' ? '#f59e0b' : '#3b82f6';

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}><span className="gradient-text">Anomaly Detection</span></h1>

      {/* Current twin anomaly state */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{
          border: ts?.anomaly_detected ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.2)',
          background: ts?.anomaly_detected ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.03)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ▸ CURRENT ANOMALY STATE
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: ts?.anomaly_detected ? '#ef4444' : '#10b981' }}>
            {ts?.anomaly_detected ? '⚠ ANOMALY DETECTED' : '✓ NORMAL'}
          </div>
          {ts?.anomaly_reason && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {ts.anomaly_reason.split(';').map((r, i) => (
                <div key={i} style={{ padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  • {r.trim()}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ▸ DETECTION METHODOLOGY
          </div>
          <div style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.7 }}>
            <strong style={{ color: '#e2e8f0' }}>Level 1 — Rule-Based:</strong><br/>
            • Temperature: &lt;20°C or &gt;40°C = alert<br/>
            • Spike: &gt;5°C change between readings<br/>
            • MQ: &gt;200 ADC change = spike alert<br/>
            • Gas production: &lt;0.3 L/min [SIM]<br/><br/>
            <strong style={{ color: '#e2e8f0' }}>Level 2 — Trend-Based (rolling window):</strong><br/>
            • Declining slope over last 10 readings<br/>
            • MQ coefficient of variation &gt;25%<br/>
            • Gas drop &gt;30% from window mean [SIM]
          </div>
        </div>
      </div>

      {/* Alert history */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            ▸ ALERT HISTORY ({alerts.length} total)
          </div>
          <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }} onClick={load}>
            ↻ Refresh
          </button>
        </div>

        {alerts.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
            No alerts recorded yet. The system is monitoring...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                background: `${levelColor(a.level)}08`,
                border: `1px solid ${levelColor(a.level)}25`,
                borderRadius: 10, padding: '0.65rem 0.85rem',
                opacity: a.acknowledged ? 0.5 : 1,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: levelColor(a.level), marginTop: 5, flexShrink: 0,
                }}/>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: levelColor(a.level) }}>{a.level}</span>
                    {a.acknowledged && <span style={{ fontSize: '0.65rem', color: '#475569' }}>ACKNOWLEDGED</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{a.message ?? '—'}</div>
                  <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.25rem' }}>
                    {new Date(a.timestamp).toLocaleString()}
                    {a.value != null && ` · value: ${a.value.toFixed(2)}`}
                  </div>
                </div>
                {!a.acknowledged && (
                  <button className="btn-outline" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', flexShrink: 0 }}
                    onClick={() => acknowledge(a.id)}>
                    ACK
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

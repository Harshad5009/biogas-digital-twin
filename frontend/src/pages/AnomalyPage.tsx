import React, { useEffect, useState } from 'react';
import { systemApi } from '../services/api';
import type { Alert, TwinState } from '../types';
import { formatDateTime } from '../utils/formatters';

interface RemediationItem {
  title: string;
  category: string;
  urgency: string;
  root_cause: string;
  farmer_actions: string[];
  recovery_target: string;
}

interface RemediationResponse {
  status: string;
  is_anomaly: boolean;
  primary_diagnosis: RemediationItem;
  secondary_diagnoses: RemediationItem[];
  all_scenarios: Record<string, RemediationItem>;
}

interface Props { twinState: TwinState | null; }

export const AnomalyPage: React.FC<Props> = ({ twinState: ts }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [remediation, setRemediation] = useState<RemediationResponse | null>(null);
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('primary');
  const [actionChecked, setActionChecked] = useState<Record<string, boolean>>({});

  const loadAlerts = () => {
    systemApi.getAnomalies().then((d: unknown) => setAlerts(d as Alert[])).catch(() => {});
  };

  const loadRemediation = () => {
    systemApi.getRemediation().then((d: unknown) => {
      setRemediation(d as RemediationResponse);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAlerts();
    loadRemediation();
  }, [ts?.update_count]);

  const acknowledge = async (id: number) => {
    await systemApi.acknowledge(id);
    loadAlerts();
  };

  const levelColor = (l: string) =>
    l === 'CRITICAL' ? '#ef4444' : l === 'WARNING' ? '#f59e0b' : '#3b82f6';

  const displayedRemediation: RemediationItem | undefined =
    selectedScenarioKey === 'primary' || !remediation?.all_scenarios?.[selectedScenarioKey]
      ? remediation?.primary_diagnosis
      : remediation?.all_scenarios?.[selectedScenarioKey];

  const urgencyColor = (u: string = '') => {
    if (u.includes('IMMEDIATE') || u.includes('CRITICAL')) return '#ef4444';
    if (u.includes('HIGH')) return '#f59e0b';
    if (u.includes('MEDIUM')) return '#3b82f6';
    return '#10b981';
  };

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            <span className="gradient-text">Explainable AI — Anomaly Diagnosis &amp; Remediation</span>
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Transparent root-cause reasoning and step-by-step Standard Operating Procedures (SOPs) for plant managers and farmers.
          </p>
        </div>
        <button className="btn-outline" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => { loadAlerts(); loadRemediation(); }}>
          ↻ Refresh Analysis
        </button>
      </div>

      {/* ── 1. REAL-TIME AI OPERATOR PRESCRIPTION CARD ───────────────────── */}
      {displayedRemediation && (
        <div className="card" style={{
          border: ts?.anomaly_detected ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(16,185,129,0.3)',
          background: ts?.anomaly_detected
            ? 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(15,23,42,0.8) 100%)'
            : 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(15,23,42,0.8) 100%)',
          borderRadius: 14,
          padding: '1.25rem',
        }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{ts?.anomaly_detected ? '🚨' : '🌱'}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: ts?.anomaly_detected ? '#fca5a5' : '#6ee7b7' }}>
                  {displayedRemediation.title}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {displayedRemediation.category}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Current Digester Status: <strong style={{ color: ts?.anomaly_detected ? '#ef4444' : '#10b981' }}>{remediation?.status}</strong>
                {ts?.temperature != null && <span> · Temp: <strong style={{ color: '#e2e8f0' }}>{ts.temperature.toFixed(1)}°C</strong></span>}
                {ts?.gas_production != null && <span> · Gas: <strong style={{ color: '#00c896' }}>{ts.gas_production.toFixed(2)} L/min</strong></span>}
                {ts?.mq5 != null && <span> · MQ-5: <strong style={{ color: '#f59e0b' }}>{Math.round(ts.mq5)} ADC</strong></span>}
              </div>
            </div>

            <div style={{
              background: `${urgencyColor(displayedRemediation.urgency)}15`,
              border: `1px solid ${urgencyColor(displayedRemediation.urgency)}40`,
              color: urgencyColor(displayedRemediation.urgency),
              padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
            }}>
              ⚡ {displayedRemediation.urgency}
            </div>
          </div>

          {/* Root Cause Box (Explainable AI) */}
          <div style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '0.9rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
              🧠 EXPLAINABLE AI ROOT CAUSE (WHY THIS HAPPENED):
            </div>
            <div style={{ fontSize: '0.84rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              {displayedRemediation.root_cause}
            </div>
          </div>

          {/* Farmer & Plant Manager Step-by-Step Action Plan */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00e599', letterSpacing: '0.06em', marginBottom: '0.6rem' }}>
              📋 WHAT THE FARMER / PLANT MANAGER MUST DO (CONTROL ACTIONS):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {displayedRemediation.farmer_actions.map((act, idx) => {
                const actionKey = `${displayedRemediation.title}-${idx}`;
                const checked = actionChecked[actionKey] || false;
                return (
                  <label
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
                      background: checked ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                      border: checked ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 8, padding: '0.6rem 0.8rem', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setActionChecked(prev => ({ ...prev, [actionKey]: !checked }))}
                      style={{ marginTop: '0.15rem', accentColor: '#00e599' }}
                    />
                    <div style={{ fontSize: '0.82rem', color: checked ? '#6ee7b7' : '#e2e8f0', lineHeight: 1.5, textDecoration: checked ? 'line-through' : 'none' }}>
                      <strong style={{ color: checked ? '#6ee7b7' : '#94a3b8', marginRight: '0.35rem' }}>Step {idx + 1}:</strong>
                      {act}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Recovery Target */}
          <div style={{
            background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.2)',
            borderRadius: 8, padding: '0.65rem 0.85rem', fontSize: '0.78rem',
            color: '#7dd3fc', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <span>🎯</span>
            <div>
              <strong>Target Recovery Metric:</strong> {displayedRemediation.recovery_target}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. SCENARIO SOP EXPLORER TABS ─────────────────────────────────── */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
          ▸ STANDARD OPERATING PROCEDURES (SOP) LIBRARY FOR FARMERS
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedScenarioKey('primary')}
            className={selectedScenarioKey === 'primary' ? 'btn-primary' : 'btn-outline'}
            style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
          >
            ⭐ Current Live Diagnosis
          </button>
          {remediation?.all_scenarios && Object.entries(remediation.all_scenarios).map(([key, item]) => (
            <button
              key={key}
              onClick={() => setSelectedScenarioKey(key)}
              className={selectedScenarioKey === key ? 'btn-primary' : 'btn-outline'}
              style={{ fontSize: '0.74rem', padding: '0.35rem 0.7rem' }}
            >
              {item.title.split('/')[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. DETECTION CRITERIA & CURRENT ANOMALY REASONS ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="card" style={{
          border: ts?.anomaly_detected ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.2)',
          background: ts?.anomaly_detected ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.03)',
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ▸ CURRENT ANOMALY SIGNATURES
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: ts?.anomaly_detected ? '#ef4444' : '#10b981' }}>
            {ts?.anomaly_detected ? '⚠ ANOMALY ACTIVE' : '✓ ALL PARAMETERS NORMAL'}
          </div>
          {ts?.anomaly_reason ? (
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.6 }}>
              {ts.anomaly_reason.split(';').map((r, i) => (
                <div key={i} style={{ padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  • {r.trim()}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
              Anaerobic digestion kinetics within optimal mesophilic stability bands (28–35°C, MQ-5 index nominal).
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ▸ HARD THRESHOLD SAFETY CRITERIA
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.7 }}>
            <strong style={{ color: '#e2e8f0' }}>Temperature (DHT11):</strong> &lt;20°C (dormancy) or &gt;40°C (thermal death)<br/>
            <strong style={{ color: '#e2e8f0' }}>Thermal Jump:</strong> &gt;5°C shift between consecutive readings<br/>
            <strong style={{ color: '#e2e8f0' }}>Flammable Gas Hazard:</strong> MQ-2 ALERT or MQ-5 &gt;650 ADC<br/>
            <strong style={{ color: '#e2e8f0' }}>Digester Gas Flow:</strong> &lt;0.30 L/min or &gt;30% drop below window mean<br/>
            <strong style={{ color: '#e2e8f0' }}>Humidity:</strong> &lt;30% or &gt;95% (condensate trap blockage)
          </div>
        </div>
      </div>

      {/* ── 4. ALERT LOG ─────────────────────────────────────────────────── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            ▸ RECORDED ANOMALY ALERTS ({alerts.length} total)
          </div>
        </div>

        {alerts.length === 0 ? (
          <div style={{ color: '#475569', textAlign: 'center', padding: '2rem', fontSize: '0.85rem' }}>
            No alerts recorded. The system is operating normally.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.slice(0, 15).map(a => (
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
                    {formatDateTime(a.timestamp)}
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

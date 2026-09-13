// pages/PredictionPage.tsx — Prediction analysis page
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { predictionsApi } from '../services/api';
import type { TwinState } from '../types';

interface Props { twinState: TwinState | null; }

export const PredictionPage: React.FC<Props> = ({ twinState: ts }) => {
  const [predictions, setPredictions] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    predictionsApi.get().then((d: unknown) => setPredictions(d as Record<string, unknown>)).catch(() => {});
  }, [ts?.update_count]);

  const gasPred = (predictions?.gas_production as Record<string, unknown>) ?? ts?.gas_prediction;
  const tempPred = (predictions?.temperature as Record<string, unknown>) ?? ts?.temp_prediction;

  // Build mini chart data: last N history + predicted point
  const gasHistory = ts?.history?.gas_production ?? [];
  const tempHistory = ts?.history?.temperature ?? [];

  const buildChartData = (hist: number[], predVal: number | null) => {
    const d = hist.map((v, i) => ({ i, value: v, type: 'actual' }));
    if (predVal !== null && predVal !== undefined) {
      d.push({ i: d.length, value: predVal, type: 'predicted' });
    }
    return d;
  };

  const gasChartData = buildChartData(gasHistory, gasPred?.predicted_value as number ?? null);
  const tempChartData = buildChartData(tempHistory, tempPred?.predicted_value as number ?? null);

  const trendColor = (trend: string) =>
    trend === 'INCREASING' ? '#10b981' : trend === 'DECREASING' ? '#ef4444' : '#64748b';

  const PredCard = ({ pred, title, unit, histData, color }: {
    pred: Record<string, unknown> | null | undefined;
    title: string; unit: string; histData: Array<{i:number;value:number;type:string}>;
    color: string;
  }) => (
    <div className="card">
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        ▸ {title}
      </div>
      {pred ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>CURRENT</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8' }}>
                {(pred.current_value as number)?.toFixed(3)}<span style={{ fontSize: '0.8rem', color: '#475569', marginLeft: 2 }}>{unit}</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>PREDICTED ({pred.horizon as string})</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>
                {(pred.predicted_value as number)?.toFixed(3)}<span style={{ fontSize: '0.8rem', color: '#475569', marginLeft: 2 }}>{unit}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{
              background: `${trendColor(pred.trend as string)}15`,
              border: `1px solid ${trendColor(pred.trend as string)}30`,
              borderRadius: 8, padding: '0.4rem 0.8rem',
              color: trendColor(pred.trend as string), fontWeight: 700, fontSize: '0.85rem',
            }}>
              {pred.trend === 'DECREASING' ? '↓' : pred.trend === 'INCREASING' ? '↑' : '→'} {pred.trend as string}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}>
              Model: <strong style={{ color: '#94a3b8' }}>{pred.model_type as string}</strong>
            </div>
            {pred.confidence !== null && pred.confidence !== undefined && (
              <div style={{ color: '#64748b', fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}>
                R²: <strong style={{ color: (pred.confidence as number) > 0.7 ? '#10b981' : '#f59e0b' }}>
                  {((pred.confidence as number) * 100).toFixed(1)}%
                </strong>
              </div>
            )}
          </div>

          {/* Mini chart */}
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={histData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="i" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false}/>
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} domain={['auto','auto']}/>
              <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem' }}/>
              <ReferenceLine x={histData.length - 2} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" label={{ value: 'now', fontSize: 9, fill: '#64748b' }}/>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={(p) => p.payload.type === 'predicted' ? (
                <circle key={p.cx} cx={p.cx} cy={p.cy} r={5} fill={color} stroke={color} strokeWidth={2} opacity={0.9}/>
              ) : <React.Fragment key={p.cx}/>}/>
            </LineChart>
          </ResponsiveContainer>

          {/* Data note */}
          <div style={{ marginTop: '0.75rem', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: '#60a5fa' }}>
            📌 {pred.data_note as string ?? 'Prediction based on simulation data.'}
          </div>
        </>
      ) : (
        <div style={{ color: '#475569', fontSize: '0.82rem', padding: '1rem 0' }}>
          Collecting data... Need at least 5 readings for prediction.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}><span className="gradient-text">Predictive Analysis</span></h1>

      <div style={{
        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#fbbf24',
      }}>
        ⚠ All predictions use <strong>Linear Regression</strong> on simulation data.
        Predictions do NOT represent real experimental outcomes.
        They demonstrate the predictive analysis capability of the Digital Twin system.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <PredCard pred={gasPred as Record<string, unknown>} title="GAS PRODUCTION PREDICTION [SIMULATION]"
          unit="L/min" histData={gasChartData} color="#00c896"/>
        <PredCard pred={tempPred as Record<string, unknown>} title="TEMPERATURE PREDICTION"
          unit="°C" histData={tempChartData} color="#3b82f6"/>
      </div>

      {/* Explanation */}
      <div className="card">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          ▸ HOW THE PREDICTION MODEL WORKS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.7 }}>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Algorithm:</strong> Linear Regression (scikit-learn)<br/>
            <strong style={{ color: '#e2e8f0' }}>Input:</strong> Last 60 readings (rolling window)<br/>
            <strong style={{ color: '#e2e8f0' }}>Output:</strong> Next ~1-minute projected value<br/>
            <strong style={{ color: '#e2e8f0' }}>Confidence:</strong> R² coefficient (0–1)
          </div>
          <div>
            <strong style={{ color: '#e2e8f0' }}>Trend classification:</strong><br/>
            ↑ INCREASING: &gt;3% projected increase<br/>
            ↓ DECREASING: &gt;3% projected decrease<br/>
            → STABLE: within ±3% range<br/>
            <strong style={{ color: '#fbbf24' }}>Note:</strong> Based on simulation data only.
          </div>
        </div>
      </div>
    </div>
  );
};

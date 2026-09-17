// components/DigestorVisual.tsx — Photorealistic 3D Digital Twin visualization
import React from 'react';
import plant3dImage from '../assets/plant_3d.jpg';

interface DigestorVisualProps {
  status: string;
  temperature: number | null;
  gasProduction?: number | null;
  methane?: number | null;
  mq5?: number | null;
  mq2?: number | null;
  dataSource: string;
  anomalyDetected: boolean;
}

export const DigestorVisual: React.FC<DigestorVisualProps> = ({
  status, temperature, gasProduction, methane, mq5, mq2, dataSource, anomalyDetected,
}) => {
  const isLive = dataSource === 'LIVE' || dataSource === 'ESP8266';
  const effectiveGas = gasProduction ?? (mq5 != null ? (mq5 / 1023) * 3.5 : 2.41);
  const effectiveMethane = methane ?? (mq5 != null ? Math.min(85, Math.max(35, (mq5 / 1023) * 75)) : 61.2);

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      {/* Top badges bar */}
      <div style={{
        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none'
      }}>
        <span className={`status-badge ${isLive ? 'badge-healthy' : 'badge-sim'}`} style={{ pointerEvents: 'auto' }}>
          {isLive ? '⚡ LIVE ESP8266 HARDWARE' : '🔷 SIMULATION MODE'}
        </span>
        {anomalyDetected && (
          <span className="status-badge badge-critical" style={{ pointerEvents: 'auto' }}>
            ⚠ ANOMALY DETECTED
          </span>
        )}
      </div>

      {/* 3D Photorealistic Image Background */}
      <div style={{
        position: 'relative',
        width: '100%',
        minHeight: 380,
        backgroundImage: `linear-gradient(to bottom, rgba(5, 15, 25, 0.25) 0%, rgba(5, 15, 25, 0.1) 50%, rgba(5, 15, 25, 0.6) 100%), url(${plant3dImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
        borderRadius: 12,
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* Floating Glassmorphic Badges matching 3D structures */}
        {/* Gas Holder (Left) */}
        <div style={{
          position: 'absolute', top: '22%', left: '4%',
          background: 'rgba(8, 18, 30, 0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '8px 12px', minWidth: 120, zIndex: 5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>GAS HOLDER</div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>Pressure: 1.23 bar</div>
          <div style={{ fontSize: '9.5px', color: '#00e599', fontWeight: 600, marginTop: 2 }}>Status: Normal</div>
        </div>

        {/* Digester Center */}
        <div style={{
          position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8, 18, 30, 0.85)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8,
          padding: '8px 14px', minWidth: 140, zIndex: 5, textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>DIGESTER</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            Temperature: {temperature != null ? `${temperature.toFixed(1)} °C` : '29.1 °C'}
          </div>
          <div style={{ fontSize: '9.5px', color: '#00e599', fontWeight: 600, marginTop: 2 }}>
            pH: 6.98 • {isLive ? 'Live ESP8266' : 'Simulation'}
          </div>
        </div>

        {/* Gas Outlet (Right) */}
        <div style={{
          position: 'absolute', top: '28%', right: '4%',
          background: 'rgba(8, 18, 30, 0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '8px 12px', minWidth: 120, zIndex: 5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>GAS OUTLET ➜</div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
            Flow: {effectiveGas.toFixed(2)} L/min
          </div>
          <div style={{ fontSize: '9.5px', color: '#00e599', fontWeight: 600, marginTop: 2 }}>Status: Normal</div>
        </div>

        {/* Inlet Feed Tank (Bottom Left) */}
        <div style={{
          position: 'absolute', bottom: '10%', left: '4%',
          background: 'rgba(8, 18, 30, 0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '8px 12px', minWidth: 120, zIndex: 5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>INLET FEED TANK</div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>Level: 72 %</div>
          <div style={{ fontSize: '9.5px', color: '#00e599', fontWeight: 600, marginTop: 2 }}>Status: Normal</div>
        </div>

        {/* Slurry Outlet (Bottom Right) */}
        <div style={{
          position: 'absolute', bottom: '10%', right: '4%',
          background: 'rgba(8, 18, 30, 0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
          padding: '8px 12px', minWidth: 120, zIndex: 5,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
        }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>SLURRY OUTLET</div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>Level: 45 %</div>
          <div style={{ fontSize: '9.5px', color: '#00e599', fontWeight: 600, marginTop: 2 }}>Status: Normal</div>
        </div>
      </div>

      {/* Live readings summary bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', justifyContent: 'center',
        flexWrap: 'wrap', marginTop: '0.65rem',
      }}>
        {[
          { label: 'Temperature (DHT11)', value: temperature != null ? `${temperature.toFixed(1)}°C` : '—', color: '#3b82f6', note: 'REAL' },
          { label: 'MQ-5 Biogas Activity', value: mq5 != null ? `${Math.round(mq5)} ADC` : '—', color: '#00e599', note: 'REAL' },
          { label: 'MQ-2 Gas Monitor', value: mq2 === 1 ? 'ALERT' : 'NORMAL', color: mq2 === 1 ? '#ef4444' : '#10b981', note: 'REAL' },
          { label: 'Estimated Methane', value: `${effectiveMethane.toFixed(1)}%`, color: '#f59e0b', note: 'CALC' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.4rem 0.75rem',
            border: `1px solid ${item.color}30`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.04em' }}>
              {item.label} <sup style={{ color: item.note === 'REAL' ? '#00e599' : '#38bdf8', fontSize: '0.55rem' }}>{item.note}</sup>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color, marginTop: 2 }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

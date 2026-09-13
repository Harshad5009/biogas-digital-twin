// components/DigestorVisual.tsx — SVG Digital Twin digester visualization
import React from 'react';

interface DigestorVisualProps {
  status: string;
  temperature: number | null;
  gasProduction: number | null;
  methane: number | null;
  dataSource: string;
  anomalyDetected: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  HEALTHY:  '#10b981',
  DEGRADING:'#f59e0b',
  CRITICAL: '#ef4444',
};

export const DigestorVisual: React.FC<DigestorVisualProps> = ({
  status, temperature, gasProduction, methane, dataSource, anomalyDetected,
}) => {
  const color = STATUS_COLOR[status] || '#10b981';
  const gasLevel = Math.min(1, (gasProduction ?? 0) / 4.0);
  const bubbleOpacity = gasLevel * 0.8 + 0.2;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 440, margin: '0 auto' }}>
      {/* Data source badge */}
      <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        <span className={`status-badge ${dataSource === 'ESP8266' ? 'badge-healthy' : 'badge-sim'}`}>
          {dataSource === 'ESP8266' ? '⚡ LIVE ESP8266' : '🔷 SIMULATION MODE'}
        </span>
        {anomalyDetected && (
          <span className="status-badge badge-critical" style={{ marginLeft: '0.5rem' }}>
            ⚠ ANOMALY
          </span>
        )}
      </div>

      <svg viewBox="0 0 440 360" style={{ width: '100%', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))' }}>
        {/* ── Ground ── */}
        <ellipse cx="220" cy="340" rx="200" ry="12" fill="rgba(0,0,0,0.3)" />

        {/* ── Main Digester Dome ── */}
        {/* Body cylinder */}
        <rect x="80" y="180" width="280" height="140" rx="8" fill="#1a2a1a" stroke={color} strokeWidth="2" opacity="0.9"/>
        {/* Dome top */}
        <ellipse cx="220" cy="180" rx="140" ry="55" fill="#1e3a1e" stroke={color} strokeWidth="2"/>
        {/* Dome highlight */}
        <ellipse cx="200" cy="162" rx="70" ry="22" fill="rgba(255,255,255,0.04)"/>

        {/* ── Gas collection bubble (animated fill) ── */}
        <ellipse cx="220" cy="175" rx="115" ry="42"
          fill={`rgba(${status === 'CRITICAL' ? '239,68,68' : status === 'DEGRADING' ? '245,158,11' : '0,200,150'},${bubbleOpacity * 0.18})`}
          style={{ transition: 'all 1.5s ease' }}
        />

        {/* ── Bubbles rising (gas production indicator) ── */}
        {gasProduction && gasProduction > 0.5 && [1,2,3].map(i => (
          <circle key={i}
            cx={160 + i * 40} cy={190}
            r={4 + i}
            fill={color}
            opacity={0.15 + i * 0.1}
          >
            <animate attributeName="cy" values="190;140;190" dur={`${2 + i * 0.7}s`} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${2 + i * 0.7}s`} repeatCount="indefinite"/>
          </circle>
        ))}

        {/* ── Gas outlet pipe ── */}
        <rect x="195" y="100" width="50" height="18" rx="4" fill="#2a3a2a" stroke={color} strokeWidth="1.5"/>
        <rect x="215" y="82" width="10" height="22" fill="#2a3a2a" stroke={color} strokeWidth="1.5"/>
        {/* Flame/gas icon */}
        <text x="230" y="78" textAnchor="middle" fontSize="18" opacity={gasLevel > 0.3 ? 1 : 0.3}>🔥</text>

        {/* ── Feed inlet ── */}
        <rect x="40" y="220" width="45" height="20" rx="4" fill="#1e3a2a" stroke="#64748b" strokeWidth="1.5"/>
        <text x="63" y="215" textAnchor="middle" fontSize="10" fill="#64748b">FEED</text>
        <rect x="82" y="225" width="18" height="8" fill="#2a3a2a"/>

        {/* ── Slurry outlet ── */}
        <rect x="355" y="280" width="45" height="20" rx="4" fill="#1e3a2a" stroke="#64748b" strokeWidth="1.5"/>
        <text x="377" y="275" textAnchor="middle" fontSize="10" fill="#64748b">SLURRY</text>
        <rect x="340" y="285" width="18" height="8" fill="#2a3a2a"/>

        {/* ── Sensor indicators ── */}
        {/* DHT11 Temp/Humidity sensor */}
        <circle cx="130" cy="210" r="10" fill="#1a2236" stroke="#3b82f6" strokeWidth="2"/>
        <text x="130" y="214" textAnchor="middle" fontSize="8" fill="#3b82f6" fontWeight="bold">T</text>
        <text x="130" y="200" textAnchor="middle" fontSize="9" fill="#60a5fa">DHT11</text>

        {/* MQ-5 gas sensor */}
        <circle cx="220" cy="235" r="10" fill="#1a2236" stroke="#f59e0b" strokeWidth="2"/>
        <text x="220" y="239" textAnchor="middle" fontSize="7" fill="#f59e0b" fontWeight="bold">MQ5</text>

        {/* MQ-2 gas/smoke sensor */}
        <circle cx="310" cy="210" r="10" fill="#1a2236" stroke="#8b5cf6" strokeWidth="2"/>
        <text x="310" y="214" textAnchor="middle" fontSize="7" fill="#8b5cf6" fontWeight="bold">MQ2</text>
        <text x="310" y="200" textAnchor="middle" fontSize="9" fill="#8b5cf6">MQ-2</text>

        {/* ── Status indicator light ── */}
        <circle cx="220" cy="145" r="8" fill={color} opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite"/>
        </circle>

        {/* ── Labels ── */}
        <text x="220" y="330" textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">
          DIGESTION CHAMBER
        </text>
        <text x="220" y="345" textAnchor="middle" fontSize="9" fill="#475569">
          Virtual Digital Twin — {dataSource}
        </text>
      </svg>

      {/* ── Live readings overlay ── */}
      <div style={{
        display: 'flex', gap: '0.75rem', justifyContent: 'center',
        flexWrap: 'wrap', marginTop: '0.5rem',
      }}>
        {[
          { label: 'Temp', value: temperature != null ? `${temperature.toFixed(1)}°C` : '—', color: '#3b82f6' },
          { label: 'Gas', value: gasProduction != null ? `${gasProduction.toFixed(2)} L/min` : '—', color, note: 'SIM' },
          { label: 'CH₄', value: methane != null ? `${methane.toFixed(1)}%` : '—', color: '#f59e0b', note: 'SIM' },
        ].map(item => (
          <div key={item.label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '0.4rem 0.75rem',
            border: `1px solid ${item.color}30`, textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em' }}>
              {item.label}{item.note && <sup style={{ color: '#3b82f6', fontSize: '0.55rem', marginLeft: 2 }}>{item.note}</sup>}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

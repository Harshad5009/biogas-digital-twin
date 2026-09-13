// components/HealthRing.tsx — Animated circular health score gauge
import React from 'react';

interface HealthRingProps {
  score: number;   // 0–100
  status: string;
  size?: number;
}

const STATUS_COLOR: Record<string, string> = {
  HEALTHY:  '#10b981',
  DEGRADING:'#f59e0b',
  CRITICAL: '#ef4444',
};

export const HealthRing: React.FC<HealthRingProps> = ({ score, status, size = 140 }) => {
  const r = (size / 2) - 14;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const color = STATUS_COLOR[status] || '#10b981';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={12} />
        {/* Progress */}
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 800, color, lineHeight: 1 }}>
          {Math.round(score)}
        </div>
        <div style={{ fontSize: size * 0.09, color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
          /100
        </div>
        <div style={{
          fontSize: size * 0.09, fontWeight: 700, color,
          letterSpacing: '0.05em', marginTop: '0.1rem'
        }}>
          {status}
        </div>
      </div>
    </div>
  );
};

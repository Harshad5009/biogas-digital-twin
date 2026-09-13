// components/KpiCard.tsx — Animated KPI metric card
import React from 'react';

interface KpiCardProps {
  label: string;
  value: number | string | null;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;      // CSS color for the value
  badge?: string;      // e.g. "SIMULATION"
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable' | null;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, unit, icon, color = '#00c896', badge, subtitle, trend,
}) => {
  const displayVal = value === null || value === undefined ? '—' : value;

  return (
    <div className="card animate-slide-in" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18, transparent)`,
        transform: 'translate(20px,-20px)',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value" style={{ color, marginTop: '0.35rem' }}>
            {displayVal}
            {unit && <span className="metric-unit">{unit}</span>}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.25rem' }}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div style={{ fontSize: '0.75rem', marginTop: '0.3rem', color: trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b' }}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trend}
            </div>
          )}
        </div>
        {icon && (
          <div style={{ color, opacity: 0.7, marginTop: '0.1rem' }}>{icon}</div>
        )}
      </div>

      {badge && (
        <div className="status-badge badge-sim" style={{ marginTop: '0.75rem', fontSize: '0.65rem' }}>
          {badge}
        </div>
      )}
    </div>
  );
};

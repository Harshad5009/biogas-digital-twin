import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Box, Activity, History,
  TrendingUp, LineChart, Bell, Sliders, FileText, Settings, ShieldCheck, Wifi, Clock
} from 'lucide-react';
import type { TwinState } from '../types';

interface SidebarProps {
  connected: boolean;
  twinState: TwinState | null;
}

const MENU_ITEMS = [
  { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/twin', label: 'Digital Twin', icon: <Box size={18} /> },
  { path: '/sensors', label: 'Live Data', icon: <Activity size={18} /> },
  { path: '/history', label: 'Historical Data', icon: <History size={18} /> },
  { path: '/analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
  { path: '/prediction', label: 'Predictions', icon: <LineChart size={18} /> },
  { path: '/anomalies', label: 'Alerts', icon: <Bell size={18} />, badge: 2 },
  { path: '/whatif', label: 'What-if Simulation', icon: <Sliders size={18} /> },
  { path: '/reports', label: 'Reports', icon: <FileText size={18} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({ connected, twinState }) => {
  const status = twinState?.status ?? 'HEALTHY';
  const statusColor = status === 'HEALTHY' ? '#10b981' : status === 'DEGRADING' ? '#f59e0b' : '#ef4444';

  return (
    <aside style={{
      width: 220, background: '#080f1b', borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '1rem 0.75rem', height: 'calc(100vh - 60px)', position: 'sticky', top: 60
    }}>
      {/* Navigation Links */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        {MENU_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.55rem 0.85rem', borderRadius: 8, textDecoration: 'none',
              fontSize: '0.82rem', fontWeight: 500,
              color: isActive ? '#00e599' : '#94a3b8',
              background: isActive ? 'rgba(0, 229, 153, 0.08)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 229, 153, 0.25)' : '1px solid transparent',
              transition: 'all 0.15s ease'
            })}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {item.icon}
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span style={{
                background: '#ef4444', color: '#fff', fontSize: '0.65rem',
                fontWeight: 700, padding: '1px 6px', borderRadius: 999
              }}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Status Card */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10, padding: '0.85rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem'
      }}>
        {/* System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <ShieldCheck size={16} color={statusColor} />
          </div>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              System Status
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: statusColor }}>
              {status}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />

        {/* IoT Connection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem' }}>
          <Wifi size={14} color="#00e599" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: '#64748b' }}>IoT Connection</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{connected ? 'Strong' : 'Offline'}</span>
          </div>
        </div>

        {/* Data Frequency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem' }}>
          <Clock size={14} color="#38bdf8" />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <span style={{ color: '#64748b' }}>Data Frequency</span>
            <span style={{ color: '#f8fafc', fontWeight: 600 }}>5 sec</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

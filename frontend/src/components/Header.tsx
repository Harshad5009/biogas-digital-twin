import React, { useEffect, useState } from 'react';
import { Leaf, Cloud, Radio, Menu, Square, Play } from 'lucide-react';
import type { TwinState } from '../types';
import { simulationApi } from '../services/api';

interface HeaderProps {
  twinState: TwinState | null;
  connected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ twinState, connected }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [activeScenario, setActiveScenario] = useState('normal');
  const [simBusy, setSimBusy] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const isSimulation = twinState?.data_source === 'SIMULATION';
  const dataSource = twinState?.data_source;

  // ── Dynamic status badge ──────────────────────────────────
  const statusBadge = (() => {
    if (!connected) return { label: 'OFFLINE', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' };
    switch (dataSource) {
      case 'LIVE':
      case 'ESP8266': return { label: 'LIVE', color: '#00e599', bg: 'rgba(0,229,153,0.1)', border: 'rgba(0,229,153,0.3)' };
      case 'SIMULATION': return { label: 'SIM', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' };
      case 'STALE': return { label: 'STALE', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
      case 'WAITING':
      default: return { label: 'WAITING', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' };
    }
  })();

  // ── Simulation controls ───────────────────────────────────
  const handleStartSimulation = async () => {
    setSimBusy(true);
    try {
      await simulationApi.start(activeScenario);
    } catch (e) {
      console.error('Failed to start simulation:', e);
    } finally {
      setSimBusy(false);
    }
  };

  const handleStopSimulation = async () => {
    setSimBusy(true);
    try {
      await simulationApi.stop();
    } catch (e) {
      console.error('Failed to stop simulation:', e);
    } finally {
      setSimBusy(false);
    }
  };

  const handleScenarioChange = async (sc: string) => {
    setActiveScenario(sc);
    if (isSimulation) {
      // Immediately switch scenario if simulation is already running
      setSimBusy(true);
      try {
        await simulationApi.start(sc);
      } catch (e) {
        console.error(e);
      } finally {
        setSimBusy(false);
      }
    }
  };

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.65rem 1.25rem', background: '#080f1c', borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky', top: 0, zIndex: 30, flexWrap: 'wrap', gap: '0.5rem'
    }}>
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg, rgba(0,229,153,0.15), rgba(16,185,129,0.3))',
          border: '1px solid rgba(0,229,153,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Leaf size={18} color="#00e599" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', lineHeight: 1.2 }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#00e599', letterSpacing: '0.02em' }}>
              BIOGAS PLANT
            </span>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#ffffff', letterSpacing: '0.02em' }}>
              DIGITAL TWIN
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>
            Real-time Monitoring &amp; Intelligent Analytics
          </div>
        </div>
      </div>

      {/* Center: Plant Status + Simulation Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          <span>Plant ID: <strong style={{ color: '#f8fafc' }}>BG-001</strong></span>
          <span className="online-pill">
            <span className="pulse-dot" />
            {connected ? 'ONLINE' : 'CONNECTING'}
          </span>
        </div>

        {/* Scenario selector */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6, padding: '2px 6px'
        }}>
          <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
            Scenario:
          </span>
          <select
            value={activeScenario}
            onChange={(e) => handleScenarioChange(e.target.value)}
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              fontSize: '0.72rem', fontWeight: 700, outline: 'none', cursor: 'pointer'
            }}
          >
            <option value="normal" style={{ background: '#0c1524', color: '#fff' }}>1. Normal Operation</option>
            <option value="temp_drop" style={{ background: '#0c1524', color: '#fff' }}>2. Temperature Drop</option>
            <option value="gas_degradation" style={{ background: '#0c1524', color: '#fff' }}>3. Gas Degradation</option>
            <option value="sudden_spike" style={{ background: '#0c1524', color: '#fff' }}>4. Gas Sensor Spike</option>
            <option value="recovery" style={{ background: '#0c1524', color: '#fff' }}>5. Recovery Mode</option>
          </select>
        </div>

        {/* Start Simulation Button (shown when NOT in simulation) */}
        {!isSimulation && (
          <button
            onClick={handleStartSimulation}
            disabled={simBusy}
            title="Start simulation with selected scenario"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
              color: '#38bdf8', padding: '0.3rem 0.65rem', borderRadius: 6,
              fontSize: '0.72rem', fontWeight: 700, cursor: simBusy ? 'not-allowed' : 'pointer',
              opacity: simBusy ? 0.6 : 1
            }}
          >
            <Play size={12} />
            Start Simulation
          </button>
        )}

        {/* Stop Simulation Button (shown when IN simulation) */}
        {isSimulation && (
          <button
            onClick={handleStopSimulation}
            disabled={simBusy}
            title="Stop simulation and return to live hardware mode"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', padding: '0.3rem 0.65rem', borderRadius: 6,
              fontSize: '0.72rem', fontWeight: 700, cursor: simBusy ? 'not-allowed' : 'pointer',
              opacity: simBusy ? 0.6 : 1
            }}
          >
            <Square size={12} />
            Stop Simulation
          </button>
        )}
      </div>

      {/* Right: Clock + dynamic status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Last Updated: <strong style={{ color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>{timeStr}</strong>
        </div>

        <button style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8, padding: '0.35rem 0.55rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center'
        }}>
          <Cloud size={15} />
        </button>

        {/* Dynamic data-source status badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: statusBadge.bg, border: `1px solid ${statusBadge.border}`,
          color: statusBadge.color, padding: '0.3rem 0.65rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700
        }}>
          <Radio size={13} />
          <span>{statusBadge.label}</span>
        </div>

        <button style={{
          background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center'
        }}>
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
};

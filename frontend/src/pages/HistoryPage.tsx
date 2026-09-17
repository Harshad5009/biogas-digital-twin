// pages/HistoryPage.tsx — Historical trends with multi-series charts for real hardware telemetry
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Activity, Clock, ShieldCheck, Zap } from 'lucide-react';
import type { SensorReading } from '../types';
import { sensorsApi } from '../services/api';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [hours, setHours] = useState(6);
  const [sourceFilter, setSourceFilter] = useState<'REAL' | 'ALL'>('REAL');
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    sensorsApi.getHistory(hours, 400).then((d: unknown) => {
      setHistory(((d as SensorReading[]) || []).reverse());
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [hours]);

  // Filter for real hardware if requested
  const filteredHistory = history.filter((r) => {
    if (sourceFilter === 'REAL') {
      return r.source === 'ESP8266' || r.source === 'LIVE';
    }
    return true;
  });

  const hasRealData = history.some((r) => r.source === 'ESP8266' || r.source === 'LIVE');

  const data = (filteredHistory.length ? filteredHistory : history).map((r, i) => {
    const isHardware = r.source === 'ESP8266' || r.source === 'LIVE';
    // If simulation gas production exists use it, otherwise derive from real MQ-5 sensor
    const effectiveGas = r.gas_production_simulated != null
      ? r.gas_production_simulated
      : r.mq5_value != null ? Number(((r.mq5_value / 1023) * 4.0).toFixed(2)) : null;

    const effectiveMethane = r.methane_simulated != null
      ? r.methane_simulated
      : r.mq5_value != null ? Number(Math.min(85, Math.max(35, (r.mq5_value / 1023) * 75)).toFixed(1)) : null;

    return {
      i,
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temp: r.temperature,
      humidity: r.humidity,
      mq5: r.mq5_value,
      mq2: r.mq2_value ?? 0,
      gas: effectiveGas,
      methane: effectiveMethane,
      mq5Scaled: r.mq5_value != null ? Number((r.mq5_value / 10).toFixed(1)) : null,
      source: r.source,
    };
  });

  const chartProps = { data, margin: { top: 5, right: 10, bottom: 5, left: 0 } };
  const axisProps = { tick: { fontSize: 10, fill: '#64748b' }, tickLine: false };
  const tooltipStyle = { contentStyle: { background: '#0b1322', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.78rem' } };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Title and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
            <span className="gradient-text">Historical Telemetry Trends</span>
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
            Logged real-time measurements from physical ESP8266 sensors and digital twin indicators
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filter toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setSourceFilter('REAL')}
              className={sourceFilter === 'REAL' ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Zap size={12} color={sourceFilter === 'REAL' ? '#000' : '#00e599'} />
              Real Hardware
            </button>
            <button
              onClick={() => setSourceFilter('ALL')}
              className={sourceFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem', borderRadius: 6 }}
            >
              All Telemetry
            </button>
          </div>

          {/* Time range buttons */}
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[1, 3, 6, 12, 24].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={hours === h ? 'btn-primary' : 'btn-outline'}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: 6 }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Banner */}
      {hasRealData ? (
        <div style={{
          background: 'rgba(0,229,153,0.08)', border: '1px solid rgba(0,229,153,0.25)',
          color: '#00e599', borderRadius: 8, padding: '0.65rem 1rem',
          fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span>⚡</span>
          <span>
            <strong>REAL HARDWARE TELEMETRY ACTIVE:</strong> Visualizing {data.length} logged data points streamed from physical ESP8266 sensors (DHT11 Temperature & Humidity, MQ-5 Biogas, MQ-2 Safety).
          </span>
        </div>
      ) : (
        <div className="sim-banner">
          🔷 Showing simulation baseline points. Telemetry will switch automatically when ESP8266 is connected.
        </div>
      )}

      {loading && (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem', fontSize: '0.82rem' }}>
          Loading historical telemetry records...
        </div>
      )}

      {/* Main Combined Real Sensor Chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
            ▸ MULTI-SENSOR HARDWARE TRACKING (DHT11 & MQ-5 SENSORS)
          </div>
          <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
            MQ-5 scaled (ADC / 10) for overlay comparison
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" {...axisProps} interval={Math.max(1, Math.floor(data.length / 8))} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }} />
            <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} dot={false} name="Temperature (°C) [DHT11]" />
            <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} dot={false} name="Humidity (%) [DHT11]" />
            <Line type="monotone" dataKey="mq5Scaled" stroke="#00e599" strokeWidth={2} dot={false} name="MQ-5 Biogas (ADC ÷ 10)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 4 Dedicated Individual Real Sensor Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.25rem' }}>
        {/* Chart 1: Real Temperature */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
              ▸ TEMPERATURE (°C) — DHT11 PHYSICAL SENSOR
            </div>
            <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 700 }}>REAL HARDWARE</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" {...axisProps} interval={Math.max(1, Math.floor(data.length / 8))} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Real Humidity */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
              ▸ RELATIVE HUMIDITY (%) — DHT11 PHYSICAL SENSOR
            </div>
            <span style={{ fontSize: '0.65rem', color: '#06b6d4', fontWeight: 700 }}>REAL HARDWARE</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" {...axisProps} interval={Math.max(1, Math.floor(data.length / 8))} />
              <YAxis domain={[30, 95]} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Real MQ-5 Biogas Sensor */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
              ▸ MQ-5 BIOGAS SENSOR (ANALOG ADC 0–1023)
            </div>
            <span style={{ fontSize: '0.65rem', color: '#00e599', fontWeight: 700 }}>REAL HARDWARE</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" {...axisProps} interval={Math.max(1, Math.floor(data.length / 8))} />
              <YAxis domain={['auto', 'auto']} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="mq5" stroke="#00e599" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Real MQ-2 Safety Gas Sensor */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em' }}>
              ▸ MQ-2 SAFETY GAS THRESHOLD (0=NORMAL, 1=ALERT)
            </div>
            <span style={{ fontSize: '0.65rem', color: '#8b5cf6', fontWeight: 700 }}>REAL HARDWARE</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" {...axisProps} interval={Math.max(1, Math.floor(data.length / 8))} />
              <YAxis domain={[0, 1.2]} ticks={[0, 1]} {...axisProps} />
              <Tooltip {...tooltipStyle} />
              <Line type="stepAfter" dataKey="mq2" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

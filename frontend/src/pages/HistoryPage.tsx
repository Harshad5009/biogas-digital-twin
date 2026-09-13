// pages/HistoryPage.tsx — Historical trends with multi-series charts
import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import type { SensorReading } from '../types';
import { sensorsApi } from '../services/api';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [hours, setHours] = useState(6);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    sensorsApi.getHistory(hours, 300).then((d: unknown) => {
      setHistory(((d as SensorReading[]) || []).reverse());
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [hours]);

  const data = history.map((r, i) => ({
    i,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp: r.temperature,
    humidity: r.humidity,
    mq5: r.mq5_value,
    mq2: r.mq2_value,
    gas: r.gas_production_simulated,
    methane: r.methane_simulated,
  }));

  const chartProps = { data, margin: { top: 5, right: 10, bottom: 5, left: 0 } };
  const axisProps = { tick: { fontSize: 10, fill: '#64748b' }, tickLine: false };
  const tooltipStyle = { contentStyle: { background: '#1a2236', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e2e8f0', fontSize: '0.78rem' }};

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1300, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}><span className="gradient-text">Historical Trends</span></h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[1, 3, 6, 12, 24].map(h => (
            <button key={h} onClick={() => setHours(h)}
              className={hours === h ? 'btn-primary' : 'btn-outline'}
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      <div className="sim-banner">
        🔷 Gas production and methane are SIMULATION ESTIMATES — not real experimental measurements.
      </div>

      {loading ? <div style={{ color: '#64748b', textAlign: 'center', padding: '2rem' }}>Loading...</div> : null}

      {[
        { title: 'Temperature (°C)', key: 'temp', color: '#3b82f6', domain: [15, 45] as [number,number] },
        { title: 'Humidity (%)', key: 'humidity', color: '#06b6d4', domain: [30, 95] as [number,number] },
        { title: 'Gas Production — SIMULATION (L/min)', key: 'gas', color: '#00c896', domain: [0, 4] as [number,number] },
        { title: 'Methane Estimate — SIMULATION (%)', key: 'methane', color: '#f97316', domain: [20, 80] as [number,number] },
        { title: 'MQ-5 Indicator (ADC units)', key: 'mq5', color: '#f59e0b', domain: ['auto','auto'] as [string,string] },
        { title: 'MQ-2 Indicator (ADC units)', key: 'mq2', color: '#8b5cf6', domain: ['auto','auto'] as [string,string] },
      ].map(chart => (
        <div key={chart.key} className="card">
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            ▸ {chart.title}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="time" {...axisProps} interval={Math.floor(data.length / 8)}/>
              <YAxis domain={chart.domain as [number,number]} {...axisProps}/>
              <Tooltip {...tooltipStyle}/>
              <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      {/* Combined chart */}
      <div className="card">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          ▸ MULTI-PARAMETER OVERVIEW (normalized ADC)
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart {...chartProps}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="time" {...axisProps} interval={Math.floor(data.length / 8)}/>
            <YAxis {...axisProps}/>
            <Tooltip {...tooltipStyle}/>
            <Legend wrapperStyle={{ fontSize: '0.75rem' }}/>
            <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Temp (°C)"/>
            <Line type="monotone" dataKey="humidity" stroke="#06b6d4" strokeWidth={1.5} dot={false} name="Humidity (%)"/>
            <Line type="monotone" dataKey="gas" stroke="#00c896" strokeWidth={2} dot={false} name="Gas (L/min) [SIM]"/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

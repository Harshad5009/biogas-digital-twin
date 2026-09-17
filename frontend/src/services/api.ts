// services/api.ts — All API calls to the FastAPI backend
import type { TwinState } from '../types';

// Use env var if set, otherwise smart fallback: local dev proxy on localhost, Render backend in production
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const BASE =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? '/api' : 'https://biogas-digital-twin-1.onrender.com/api');

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json();
}

// ── Sensors ──────────────────────────────────────────────────
export const sensorsApi = {
  getLatest: (source?: string) =>
    get(`/sensors/latest${source ? `?source=${source}` : ''}`),

  getHistory: (hours = 24, limit = 200) =>
    get(`/sensors/history?hours=${hours}&limit=${limit}`),
};

// ── Digital Twin ──────────────────────────────────────────────
export const twinApi = {
  getState: () => get<TwinState>('/twin/state'),
  getHealth: () => get('/twin/health'),
  getHistory: (limit = 100) => get(`/twin/history?limit=${limit}`),
};

// ── Predictions ───────────────────────────────────────────────
export const predictionsApi = {
  get: () => get('/predictions/'),
  getHistory: () => get('/predictions/history'),
};

// ── Simulation ────────────────────────────────────────────────
export const simulationApi = {
  start: (scenario: string) => post('/simulation/start', { scenario }),
  stop: () => post('/simulation/stop', {}),
  getStatus: () => get('/simulation/status'),
  whatIf: (params: object) => post('/simulation/what-if', params),
};

// ── System / Alerts ───────────────────────────────────────────
export const systemApi = {
  getStatus: () => get('/system/status'),
  getAnomalies: () => get('/anomalies'),
  acknowledge: (id: number) => post(`/anomalies/${id}/acknowledge`, {}),
};
// services/api.ts — All API calls to the FastAPI backend

const BASE = 'https://biogas-digital-twin-1.onrender.com/api';

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
  getLatest: () => get('/sensors/latest'),

  getHistory: (hours = 24, limit = 200) =>
    get(`/sensors/history?hours=${hours}&limit=${limit}`),
};

// ── Digital Twin ──────────────────────────────────────────────
export const twinApi = {
  getState: () => get('/twin/state'),
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
  getStatus: () => get('/simulation/status'),
  whatIf: (params: object) => post('/simulation/what-if', params),
};

// ── System / Alerts ───────────────────────────────────────────
export const systemApi = {
  getStatus: () => get('/system/status'),
  getAnomalies: () => get('/anomalies'),
  acknowledge: (id: number) => post(`/anomalies/${id}/acknowledge`, {}),
};
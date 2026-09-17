// types/index.ts — All TypeScript types for the Biogas Digital Twin frontend

export interface SensorReading {
  id: number;
  timestamp: string;
  device_id: string;
  temperature: number | null;
  humidity: number | null;
  mq5_value: number | null;
  mq2_value: number | null;
  methane_simulated: number | null;
  gas_production_simulated: number | null;
  source: 'LIVE' | 'SIMULATION' | 'ESP8266';
}

export interface TwinState {
  temperature: number | null;
  humidity: number | null;
  mq5: number | null;
  mq2: number | null;
  gas_indicator: number | null;
  methane_estimate: number | null;
  gas_production: number | null;
  health_score: number;
  status: 'HEALTHY' | 'DEGRADING' | 'CRITICAL';
  anomaly_detected: boolean;
  anomaly_reason: string | null;
  last_update: string | null;
  data_source: 'LIVE' | 'ESP8266' | 'SIMULATION' | 'WAITING' | 'STALE' | 'DISCONNECTED';
  mode?: string;
  connection_status?: string;
  last_live_timestamp?: string | null;
  update_count: number;
  gas_prediction: PredictionResult | null;
  temp_prediction: PredictionResult | null;
  history: {
    temperature: number[];
    gas_production: number[];
    health_score: number[];
  };
}

export interface PredictionResult {
  parameter: string;
  current_value: number | null;
  predicted_value: number | null;
  horizon: string;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  confidence: number | null;
  model_type: string;
  data_note: string;
  message?: string;
}

export interface WhatIfRequest {
  temperature?: number;
  humidity?: number;
  mq5_override?: number;
  mq2_override?: number;
  duration_hours: number;
}

export interface WhatIfResult {
  disclaimer: string;
  input_temperature: number;
  input_humidity: number;
  input_mq5: number;
  input_mq2?: number;
  duration_hours: number;
  predicted_methane: number;
  predicted_gas_production: number;
  predicted_health_score: number;
  predicted_status: string;
  summary: string;
  data_note: string;
}

export interface Alert {
  id: number;
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string | null;
  parameter: string | null;
  value: number | null;
  acknowledged: boolean;
}

export interface SystemStatus {
  backend: string;
  mqtt_connected: boolean;
  simulation_active: boolean;
  database_ok: boolean;
  digester_id: string;
  last_data_received: string | null;
  data_source: string;
}

export interface HealthDetail {
  score: number;
  status: string;
  factors: HealthFactor[];
  summary: string;
  anomaly_penalty: number;
}

export interface HealthFactor {
  name: string;
  value: number | null;
  optimal_range: [number, number] | null;
  score: number;
  max: number;
  note: string;
}

export interface WebSocketMessage {
  type: 'update' | 'connected' | 'pong';
  twin_state?: TwinState;
  raw?: Partial<SensorReading>;
  message?: string;
}

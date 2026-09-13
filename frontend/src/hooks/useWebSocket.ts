// hooks/useWebSocket.ts — WebSocket hook for real-time updates
import { useEffect, useRef, useState, useCallback } from 'react';
import type { TwinState, WebSocketMessage } from '../types';

const WS_URL = `ws://${window.location.hostname}:8000/ws`;

export function useWebSocket() {
  const [twinState, setTwinState] = useState<TwinState | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastRaw, setLastRaw] = useState<Record<string, unknown> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // Start ping interval
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30000);
      ws.addEventListener('close', () => clearInterval(ping));
    };

    ws.onmessage = (evt) => {
      try {
        const msg: WebSocketMessage = JSON.parse(evt.data);
        if (msg.type === 'update' && msg.twin_state) {
          setTwinState(msg.twin_state);
          if (msg.raw) setLastRaw(msg.raw as Record<string, unknown>);
        } else if (msg.type === 'connected' && msg.twin_state) {
          setTwinState(msg.twin_state);
        }
      } catch (e) {
        console.warn('WS parse error:', e);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { twinState, connected, lastRaw };
}

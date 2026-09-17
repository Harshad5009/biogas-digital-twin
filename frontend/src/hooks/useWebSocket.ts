import { useEffect, useRef, useState, useCallback } from 'react';
import type { TwinState, WebSocketMessage } from '../types';
import { twinApi } from '../services/api';

// Use env var if set, otherwise smart fallback: local dev backend on localhost, Render backend in production
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (isLocalhost
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8001/ws`
    : 'wss://biogas-digital-twin-1.onrender.com/ws');

export function useWebSocket() {
  const [twinState, setTwinState] = useState<TwinState | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastRaw, setLastRaw] = useState<Record<string, unknown> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    // Avoid opening multiple connections
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    try {
      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected to:', WS_URL);
        setConnected(true);

        // Keep the connection alive with periodic pings
        const pingInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('ping');
          }
        }, 30000);

        socket.addEventListener('close', () => {
          clearInterval(pingInterval);
        });
      };

      socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'update' && message.twin_state) {
            setTwinState(message.twin_state);

            if (message.raw) {
              setLastRaw(message.raw as Record<string, unknown>);
            }
          } else if (
            message.type === 'connected' &&
            message.twin_state
          ) {
            setTwinState(message.twin_state);
          }
          // Ignore 'pong' type messages — they are just keepalive responses
        } catch (error) {
          console.warn('WebSocket message parsing error:', error);
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setConnected(false);
        wsRef.current = null;

        if (shouldReconnect.current) {
          reconnectTimer.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      socket.onerror = (error) => {
        console.warn('WebSocket error:', error);
        setConnected(false);
      };
    } catch (error) {
      console.warn('Unable to create WebSocket connection:', error);
      setConnected(false);
    }
  }, []);

  // 1. Immediately fetch current twin state via HTTP on mount so data displays in < 200ms
  useEffect(() => {
    let active = true;
    twinApi.getState()
      .then((state) => {
        if (active && state) {
          setTwinState((prev) => (prev !== null ? prev : state));
          setConnected(true);
        }
      })
      .catch((err) => {
        console.warn('Initial HTTP twin state fetch error:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. If WebSocket is not connected, poll via HTTP every 5s as a fallback
  useEffect(() => {
    if (connected) return;

    const pollInterval = setInterval(() => {
      twinApi.getState()
        .then((state) => {
          if (state) {
            setTwinState(state);
            setConnected(true);
          }
        })
        .catch(() => {
          // If both WS and HTTP fail, backend is truly unreachable
        });
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [connected]);

  // 3. Connect WebSocket for live streaming
  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return {
    twinState,
    connected,
    lastRaw,
  };
}

import { useEffect, useRef, useState, useCallback } from "react";

export interface WSMsg {
  type: string;
  [key: string]: unknown;
}

type Handler = (msg: WSMsg) => void;

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function useWebSocket(userId: number | null | undefined, token: string | null | undefined) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlers = useRef<Set<Handler>>(new Set());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);

  const connect = useCallback(() => {
    if (!userId || !token || !mountedRef.current || connectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    connectingRef.current = true;
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as WSMsg;
        if (msg.type === "authenticated") {
          if (mountedRef.current) setIsConnected(true);
          connectingRef.current = false;
        }
        handlers.current.forEach(h => h(msg));
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      connectingRef.current = false;
      if (mountedRef.current) {
        setIsConnected(false);
        reconnectTimer.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, 3000);
      }
    };

    ws.onerror = () => {
      connectingRef.current = false;
      ws.close();
    };
  }, [userId, token]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const send = useCallback((msg: WSMsg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addHandler = useCallback((handler: Handler): (() => void) => {
    handlers.current.add(handler);
    return () => handlers.current.delete(handler);
  }, []);

  return { isConnected, send, addHandler };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '@r-file/shared';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketOptions {
  onMessage?: (message: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      options.onOpen?.();
    };

    ws.onclose = () => {
      setStatus('disconnected');
      options.onClose?.();
    };

    ws.onerror = (error) => {
      setStatus('error');
      options.onError?.(error);
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        options.onMessage?.(message);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };
  }, [options]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    status,
    connect,
    disconnect,
    send,
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '@r-file/shared';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWebSocketReturn {
  status: ConnectionStatus;
  connect: (onConnected?: () => void) => void;
  disconnect: () => void;
  send: (message: ClientMessage) => void;
  setMessageHandler: (handler: (message: ServerMessage) => void) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);
  const onConnectedCallbackRef = useRef<(() => void) | null>(null);

  const setMessageHandler = useCallback((handler: (message: ServerMessage) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  const connect = useCallback((onConnected?: () => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      onConnected?.();
      return;
    }

    onConnectedCallbackRef.current = onConnected || null;
    setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('[WebSocket] Connecting to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setStatus('connected');
      onConnectedCallbackRef.current?.();
      onConnectedCallbackRef.current = null;
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setStatus('disconnected');
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setStatus('error');
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        console.log('[WebSocket] Received:', message);
        messageHandlerRef.current?.(message);
      } catch (err) {
        console.error('[WebSocket] Failed to parse message:', err);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const send = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Sending:', message);
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send, not connected');
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
    setMessageHandler,
  };
}

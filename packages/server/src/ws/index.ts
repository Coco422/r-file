import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { handleSignaling } from './signaling.js';

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] New connection');
    handleSignaling(ws);
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });

  console.log('[WebSocket] Server initialized on /ws');
}

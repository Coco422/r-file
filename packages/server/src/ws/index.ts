import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';
import { handleSignaling } from './signaling.js';

// IP 连接跟踪
const ipConnections = new Map<string, number>();
const ipMessageCounts = new Map<string, { count: number; resetAt: number }>();

// 配置
const MAX_CONNECTIONS_PER_IP = 5;       // 每 IP 最大连接数
const MAX_MESSAGES_PER_MINUTE = 60;     // 每分钟最大消息数
const MESSAGE_WINDOW_MS = 60 * 1000;    // 消息计数窗口

function getClientIp(req: IncomingMessage): string {
  // 支持反向代理
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipMessageCounts.get(ip);

  if (!record || now > record.resetAt) {
    ipMessageCounts.set(ip, { count: 1, resetAt: now + MESSAGE_WINDOW_MS });
    return true;
  }

  if (record.count >= MAX_MESSAGES_PER_MINUTE) {
    return false;
  }

  record.count++;
  return true;
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = getClientIp(req);

    // 检查连接数限制
    const currentConnections = ipConnections.get(ip) || 0;
    if (currentConnections >= MAX_CONNECTIONS_PER_IP) {
      console.log(`[WebSocket] 拒绝连接: IP ${ip} 超过最大连接数`);
      ws.close(1008, '连接数超限');
      return;
    }

    // 增加连接计数
    ipConnections.set(ip, currentConnections + 1);
    console.log(`[WebSocket] 新连接: ${ip} (当前: ${currentConnections + 1})`);

    // 包装 ws，注入速率限制
    const originalOn = ws.on.bind(ws);
    ws.on = function (event: string, listener: (...args: any[]) => void) {
      if (event === 'message') {
        return originalOn(event, (data: any) => {
          if (!checkRateLimit(ip)) {
            console.log(`[WebSocket] 消息限流: ${ip}`);
            ws.send(JSON.stringify({
              type: 'error',
              code: 'RATE_LIMIT',
              message: '请求过于频繁，请稍后再试',
            }));
            return;
          }
          listener(data);
        });
      }
      return originalOn(event, listener);
    } as typeof ws.on;

    // 连接关闭时减少计数
    ws.on('close', () => {
      const count = ipConnections.get(ip) || 1;
      if (count <= 1) {
        ipConnections.delete(ip);
      } else {
        ipConnections.set(ip, count - 1);
      }
      console.log(`[WebSocket] 连接关闭: ${ip} (剩余: ${Math.max(0, count - 1)})`);
    });

    handleSignaling(ws);
  });

  wss.on('error', (error) => {
    console.error('[WebSocket] Server error:', error);
  });

  // 定期清理过期的消息计数记录
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipMessageCounts) {
      if (now > record.resetAt) {
        ipMessageCounts.delete(ip);
      }
    }
  }, 60 * 1000);

  console.log('[WebSocket] Server initialized on /ws');
  console.log(`[WebSocket] 限制: 每IP ${MAX_CONNECTIONS_PER_IP} 连接, ${MAX_MESSAGES_PER_MINUTE} 消息/分钟`);
}

import { createServer } from 'http';
import { app } from './app.js';
import { config } from './config/index.js';
import { initDatabase } from './db/index.js';
import { startCleanupScheduler } from './services/cleanup.js';
import { setupWebSocket } from './ws/index.js';

// 初始化数据库
initDatabase();
console.log('[Database] Initialized');

// 启动清理调度器
startCleanupScheduler();

// 创建 HTTP 服务器
const server = createServer(app);

// 设置 WebSocket
setupWebSocket(server);

// 启动服务器
server.listen(config.port, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${config.port}`);
  console.log(`[Server] WebSocket on ws://0.0.0.0:${config.port}/ws`);
  console.log(`[Server] Client URL: ${config.clientUrl}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

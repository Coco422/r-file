import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { textShareRouter } from './routes/text-share.js';

export const app = express();

// 安全中间件
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.clientUrl,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// 请求体解析
app.use(express.json({ limit: '50kb' }));

// 速率限��
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 100 次请求
  message: { success: false, error: { code: 'RATE_LIMIT', message: '请求过于频繁' } },
});

// 路由
app.use('/api/text', apiLimiter, textShareRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' },
  });
});

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
});

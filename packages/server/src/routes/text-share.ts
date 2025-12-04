import { Router } from 'express';
import { z } from 'zod';
import {
  createTextShare,
  getTextShare,
  checkNeedPassword,
} from '../services/text-share.js';
import { EXPIRES_OPTIONS, MAX_TEXT_SIZE, type ApiResponse } from '@r-file/shared';

const router = Router();

// 创建分享请求验证
const createSchema = z.object({
  content: z.string().min(1).max(MAX_TEXT_SIZE),
  expiresIn: z.number().refine((v) => EXPIRES_OPTIONS.includes(v as any)),
  password: z.string().optional(),
});

// POST /api/text - 创建文本分享
router.post('/', async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await createTextShare(data as any);
    res.json({ success: true, data: result } as ApiResponse);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '请求参数无效' },
      } as ApiResponse);
      return;
    }
    if (error.code) {
      res.status(400).json({
        success: false,
        error: { code: error.code, message: error.message },
      } as ApiResponse);
      return;
    }
    console.error('[TextShare] Create error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    } as ApiResponse);
  }
});

// GET /api/text/:code - 获取文本分享
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const password = req.query.password as string | undefined;
    const result = await getTextShare(code, password);
    res.json({ success: true, data: result } as ApiResponse);
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: { code: error.code, message: error.message },
      } as ApiResponse);
      return;
    }
    if (error.code === 'PASSWORD_REQUIRED' || error.code === 'INVALID_PASSWORD') {
      res.status(401).json({
        success: false,
        error: { code: error.code, message: error.message },
      } as ApiResponse);
      return;
    }
    console.error('[TextShare] Get error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    } as ApiResponse);
  }
});

// GET /api/text/:code/check - 检查是否需要密码
router.get('/:code/check', (req, res) => {
  try {
    const { code } = req.params;
    const needPassword = checkNeedPassword(code);
    res.json({ success: true, data: { needPassword } } as ApiResponse);
  } catch (error: any) {
    if (error.code === 'NOT_FOUND') {
      res.status(404).json({
        success: false,
        error: { code: error.code, message: error.message },
      } as ApiResponse);
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    } as ApiResponse);
  }
});

export const textShareRouter = router;

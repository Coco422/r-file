import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { generateCode } from './code-generator.js';
import { config } from '../config/index.js';
import {
  type CreateTextShareRequest,
  type CreateTextShareResponse,
  type GetTextShareResponse,
  MAX_TEXT_SIZE,
  EXPIRES_OPTIONS,
  TextShareErrorCodes,
} from '@r-file/shared';

interface TextShareRow {
  id: number;
  code: string;
  content: string;
  password_hash: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
}

// 创建文本分享
export async function createTextShare(
  data: CreateTextShareRequest
): Promise<CreateTextShareResponse> {
  // 验证内容大小
  if (Buffer.byteLength(data.content, 'utf-8') > MAX_TEXT_SIZE) {
    throw { code: TextShareErrorCodes.CONTENT_TOO_LARGE, message: '内容超过大小限制' };
  }

  // 验证过期时间
  if (!EXPIRES_OPTIONS.includes(data.expiresIn)) {
    throw { code: TextShareErrorCodes.INVALID_EXPIRES, message: '无效的过期时间' };
  }

  // 生成唯一短码
  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = db.prepare('SELECT 1 FROM text_shares WHERE code = ?').get(code);
    if (!existing) break;
    code = generateCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw { code: 'GENERATION_FAILED', message: '无法生成唯一短码' };
  }

  // 计算过期时间
  const expiresAt = new Date(Date.now() + data.expiresIn * 60 * 1000);

  // 密码哈希
  const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;

  // 插入数据库
  db.prepare(
    `INSERT INTO text_shares (code, content, password_hash, expires_at)
     VALUES (?, ?, ?, ?)`
  ).run(code, data.content, passwordHash, expiresAt.toISOString());

  return {
    code,
    expiresAt: expiresAt.toISOString(),
    hasPassword: !!passwordHash,
  };
}

// 获取文本分享
export async function getTextShare(
  code: string,
  password?: string
): Promise<GetTextShareResponse> {
  const row = db
    .prepare("SELECT * FROM text_shares WHERE code = ? AND expires_at > datetime('now')")
    .get(code) as TextShareRow | undefined;

  if (!row) {
    throw { code: TextShareErrorCodes.NOT_FOUND, message: '分享不存在或已过期' };
  }

  // 检查密码
  if (row.password_hash) {
    if (!password) {
      throw { code: TextShareErrorCodes.PASSWORD_REQUIRED, message: '需要访问密码' };
    }
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      throw { code: TextShareErrorCodes.INVALID_PASSWORD, message: '密码错误' };
    }
  }

  // 增加查看次数
  db.prepare('UPDATE text_shares SET view_count = view_count + 1 WHERE id = ?').run(row.id);

  return {
    content: row.content,
    expiresAt: row.expires_at,
    viewCount: row.view_count + 1,
  };
}

// 检查是否需要密码
export function checkNeedPassword(code: string): boolean {
  const row = db
    .prepare(
      "SELECT password_hash FROM text_shares WHERE code = ? AND expires_at > datetime('now')"
    )
    .get(code) as { password_hash: string | null } | undefined;

  if (!row) {
    throw { code: TextShareErrorCodes.NOT_FOUND, message: '分享不存在或已过期' };
  }

  return !!row.password_hash;
}

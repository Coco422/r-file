import type { ExpiresOption } from '../constants.js';

// 创建文本分享请求
export interface CreateTextShareRequest {
  content: string;
  expiresIn: ExpiresOption;
  password?: string;
}

// 创建文本分享响应
export interface CreateTextShareResponse {
  code: string;
  expiresAt: string;
  hasPassword: boolean;
}

// 获取文本分享响应
export interface GetTextShareResponse {
  content: string;
  expiresAt: string;
  viewCount: number;
}

// API 响应包装
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// 错误码
export const TextShareErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  PASSWORD_REQUIRED: 'PASSWORD_REQUIRED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  INVALID_EXPIRES: 'INVALID_EXPIRES',
} as const;

export type TextShareErrorCode = (typeof TextShareErrorCodes)[keyof typeof TextShareErrorCodes];

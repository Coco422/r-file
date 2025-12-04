import type {
  ApiResponse,
  CreateTextShareRequest,
  CreateTextShareResponse,
  GetTextShareResponse,
} from '@r-file/shared';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw data.error;
  }

  return data.data as T;
}

export const api = {
  // 创建文本分享
  createTextShare: (data: CreateTextShareRequest) =>
    request<CreateTextShareResponse>('/text', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // 获取文本分享
  getTextShare: (code: string, password?: string) => {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    return request<GetTextShareResponse>(`/text/${code}${params}`);
  },

  // 检查是否需要密码
  checkNeedPassword: (code: string) =>
    request<{ needPassword: boolean }>(`/text/${code}/check`),
};

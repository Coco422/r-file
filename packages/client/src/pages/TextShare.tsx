import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { EXPIRES_OPTIONS, MAX_TEXT_SIZE, type ExpiresOption } from '@r-file/shared';

const EXPIRES_LABELS: Record<ExpiresOption, string> = {
  30: '30 分钟',
  60: '1 小时',
  1440: '24 小时',
};

export default function TextShare() {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [expiresIn, setExpiresIn] = useState<ExpiresOption>(60);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null);

  const contentSize = new Blob([content]).size;
  const isOverSize = contentSize > MAX_TEXT_SIZE;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isOverSize) return;

    setLoading(true);
    setError('');

    try {
      const data = await api.createTextShare({
        content,
        expiresIn,
        password: password || undefined,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = result ? `${window.location.origin}/${result.code}` : '';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板');
    } catch {
      alert('复制失败');
    }
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">分享创建成功</h2>
          <p className="text-gray-500 mb-6">
            过期时间：{new Date(result.expiresAt).toLocaleString()}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 mb-2">分享链接</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="input flex-1 bg-white"
              />
              <button
                onClick={() => copyToClipboard(shareUrl)}
                className="btn btn-primary"
              >
                复制
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 mb-2">访问码</p>
            <p className="text-2xl font-mono font-bold text-primary-600">{result.code}</p>
          </div>

          <div className="flex justify-center mb-6">
            <QRCodeSVG value={shareUrl} size={160} />
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setResult(null);
                setContent('');
                setPassword('');
              }}
              className="btn btn-secondary"
            >
              创建新分享
            </button>
            <button onClick={() => navigate(`/${result.code}`)} className="btn btn-primary">
              查看分享
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">创建文本分享</h1>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* 文本输入 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分享内容
            <span className={`float-right ${isOverSize ? 'text-red-500' : 'text-gray-400'}`}>
              {(contentSize / 1024).toFixed(1)} / {MAX_TEXT_SIZE / 1024} KB
            </span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`input min-h-[200px] font-mono ${isOverSize ? 'border-red-500' : ''}`}
            placeholder="在此输入要分享的文本内容..."
          />
          {isOverSize && (
            <p className="text-red-500 text-sm mt-1">内容超过大小限制</p>
          )}
        </div>

        {/* 过期时间 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">过期时间</label>
          <div className="flex gap-2">
            {EXPIRES_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setExpiresIn(option)}
                className={`px-4 py-2 rounded-lg border ${
                  expiresIn === option
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                {EXPIRES_LABELS[option]}
              </button>
            ))}
          </div>
        </div>

        {/* 密码 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            访问密码（可选）
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input max-w-xs"
            placeholder="留空则无需密码"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={!content.trim() || isOverSize || loading}
          className="btn btn-primary w-full"
        >
          {loading ? '创建中...' : '创建分享'}
        </button>
      </form>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function TextView() {
  const { code } = useParams<{ code: string }>();
  const [content, setContent] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!code) return;
    checkAndLoad();
  }, [code]);

  const checkAndLoad = async () => {
    try {
      // 先检查是否需要密码
      const { needPassword: needPwd } = await api.checkNeedPassword(code!);
      if (needPwd) {
        setNeedPassword(true);
        setLoading(false);
      } else {
        await loadContent();
      }
    } catch (err: any) {
      setError(err.message || '加载失败');
      setLoading(false);
    }
  };

  const loadContent = async (pwd?: string) => {
    try {
      setLoading(true);
      const data = await api.getTextShare(code!, pwd);
      setContent(data.content);
      setExpiresAt(data.expiresAt);
      setViewCount(data.viewCount);
      setNeedPassword(false);
      setError('');
    } catch (err: any) {
      if (err.code === 'INVALID_PASSWORD') {
        setPasswordError('密码错误');
      } else {
        setError(err.message || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    loadContent(password);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      alert('已复制到剪贴板');
    } catch {
      alert('复制失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">无法访问</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/text" className="btn btn-primary">
          创建新分享
        </Link>
      </div>
    );
  }

  if (needPassword) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">需要密码</h2>
          <p className="text-gray-500 mb-6">此分享受密码保护</p>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mb-4"
              placeholder="请输入访问密码"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-500 text-sm mb-4">{passwordError}</p>
            )}
            <button type="submit" className="btn btn-primary w-full">
              验证
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">分享内容</h1>
        <button onClick={copyToClipboard} className="btn btn-primary">
          复制内容
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span>访问码：{code}</span>
          <span>浏览次数：{viewCount}</span>
          <span>过期时间：{new Date(expiresAt).toLocaleString()}</span>
        </div>
        <pre className="bg-gray-50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm">
          {content}
        </pre>
      </div>

      <div className="mt-6 text-center">
        <Link to="/text" className="text-primary-600 hover:underline">
          创建新分享
        </Link>
      </div>
    </div>
  );
}

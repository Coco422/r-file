import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-primary-600">
            文件中转站
          </Link>
          <nav className="flex gap-4">
            <Link to="/text" className="text-gray-600 hover:text-primary-600">
              文本分享
            </Link>
            <Link to="/p2p" className="text-gray-600 hover:text-primary-600">
              P2P 传输
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">{children}</main>
      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-500 text-sm">
          文件中转站 - 安全便捷的文件分享工具
        </div>
      </footer>
    </div>
  );
}

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
      <p className="text-gray-600 mb-6">页面不存在</p>
      <Link to="/" className="btn btn-primary">
        返回首页
      </Link>
    </div>
  );
}

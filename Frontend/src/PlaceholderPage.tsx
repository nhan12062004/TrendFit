import { useState, useEffect } from 'react';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';

export default function PlaceholderPage({ title }: { title: string }) {
  const [loading, setLoading] = useState(true);
  const { refreshTick } = useAuth();

  useEffect(() => {
    // Giả lập loading 500ms mỗi khi chuyển danh mục hoặc refresh
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [title, refreshTick]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-4 uppercase tracking-tighter">{title}</h2>
        <div className="w-20 h-1 bg-[#a3e635] mx-auto mb-6 rounded-full"></div>
        <p className="text-text-secondary text-lg">Trang này đang được phát triển bởi đội ngũ <span className="text-[#a3e635] font-bold">TrendFit AI</span>.</p>
        <p className="text-text-tertiary mt-2">Vui lòng quay lại sau!</p>
      </div>
    </div>
  );
}

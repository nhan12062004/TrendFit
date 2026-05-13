import { useState, useEffect } from 'react';
import MainContent from './MainContent';
import RightPanel from './RightPanel';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';

export default function Overview() {
  const { refreshTick } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chỉ hiện loading chung khi mount lần đầu để đồng bộ cả 2 panel
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []); // Remove refreshTick to prevent full-page reload on data update

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-6 min-w-0 animate-in fade-in duration-500">
      <div className="flex-[2] min-w-0">
        <MainContent />
      </div>
      <div className="w-full xl:w-80 shrink-0">
        <RightPanel />
      </div>
    </div>
  );
}

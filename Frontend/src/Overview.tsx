import { useState, useEffect } from 'react';
import MainContent from './MainContent';
import RightPanel from './RightPanel';
import LoadingScreen from './components/LoadingScreen';
import { useAuth } from './contexts/AuthContext';

export default function Overview() {
  const { refreshTick } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khi refreshTick thay đổi hoặc mount lần đầu, hiện loading chung
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // Giả lập thời gian load để đồng bộ cả 2 panel
    return () => clearTimeout(timer);
  }, [refreshTick]);

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

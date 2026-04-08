import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SurveyForm from './components/SurveyForm';
import ProfileModal from './components/ProfileModal';
import { useAuth } from './contexts/AuthContext';

export default function Dashboard() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { isLoggedIn, hasProfile, isCheckingProfile, refreshProfile } = useAuth();

  return (
    <div className="flex w-full h-screen overflow-hidden bg-bg-primary">
      {/* Initial Setup for new users */}
      {isLoggedIn && !isCheckingProfile && !hasProfile && (
        <SurveyForm onComplete={() => refreshProfile()} />
      )}

      {/* Profile Editor Modal */}
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} onProfileClick={() => setIsProfileOpen(true)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 w-full h-screen overflow-y-auto custom-scrollbar">
        <TopBar onMenuClick={() => setIsMobileMenuOpen(true)} onProfileClick={() => setIsProfileOpen(true)} />
        <main className="flex-1 p-4 md:p-6 flex flex-col xl:flex-row gap-6 min-w-0">
          <Outlet context={{ onProfileClick: () => setIsProfileOpen(true) }} />
        </main>
      </div>
    </div>
  );
}

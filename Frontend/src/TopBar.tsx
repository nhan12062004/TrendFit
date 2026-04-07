import { Search, Moon, Sun, Bell, MessageSquare, Menu, LogIn } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [isLightMode, setIsLightMode] = useState(false);
  const { isLoggedIn, login, user } = useAuth();

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [isLightMode]);

  return (
    <header className="h-[72px] md:h-20 px-4 md:px-8 flex items-center justify-between border-b border-border-primary bg-bg-primary sticky top-0 z-30 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <button className="lg:hidden text-text-secondary hover:text-text-primary transition-colors" onClick={onMenuClick}>
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative w-full max-w-2xl hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search products, order,..."
            className="w-full bg-bg-secondary border border-border-primary rounded-full py-3 pl-12 pr-4 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-[#a3e635]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <button 
          onClick={() => setIsLightMode(!isLightMode)}
          className="text-text-secondary hover:text-[#a3e635] transition-colors hidden sm:block"
        >
          {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        
        <div className="flex items-center gap-3 sm:pl-2">
          <button className="text-text-secondary hover:text-text-primary transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#a3e635] rounded-full"></span>
          </button>
          <button className="text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
            <MessageSquare className="w-5 h-5" />
          </button>
          
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary hidden md:block ml-2">{user?.name}</span>
              <div className="w-8 h-8 rounded-full bg-bg-quaternary flex items-center justify-center text-[#a3e635] font-bold text-sm sm:ml-2 cursor-pointer">
                {user?.initial}
              </div>
            </div>
          ) : (
            <button 
              onClick={login}
              className="bg-[#a3e635] text-black px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-[#bef264] transition-colors sm:ml-2"
            >
              <LogIn className="w-4 h-4" />
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

import { Home, Activity, Utensils, Timer, Target, Trophy, Settings, Dumbbell, Droplet, Flame, Shield, Calculator, TrendingUp, X, Zap, Blocks, Brain, LogIn, LogOut, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useState } from 'react';
import AuthModal from './components/AuthModal';

const menuItems = [
  { icon: Home, label: 'Tổng quan', path: '/overview' },
  { icon: Brain, label: 'Lập kế hoạch AI', path: '/smart-planner', badge: 'Mới', badgeColor: 'bg-orange-500 text-white' },
  { icon: Dumbbell, label: 'Bài tập', path: '/exercises' },
  { icon: Utensils, label: 'Chế độ ăn', path: '/diet-plan' },
  { icon: Timer, label: 'Đồng hồ bấm giờ', path: '/workout-timer' },
  { icon: Target, label: 'Mục tiêu', path: '/goals' },
  { icon: Trophy, label: 'Thành tích', badge: '2', badgeColor: 'bg-[#a3e635] text-black', path: '/achievements' },
  { icon: Blocks, label: 'Tạo bài tập', path: '/workout-builder' },
  { icon: TrendingUp, label: 'Tiến độ', path: '/progress' },
  { icon: Shield, label: 'Quản trị viên', path: '/admin-panel', adminOnly: true },
];

export default function Sidebar({ onClose, onProfileClick }: { onClose?: () => void, onProfileClick?: () => void }) {
  const { isLoggedIn, signOut, user, openAuthModal, isAdmin, profile } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Lọc menu items dựa trên vai trò (admin/user)
  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  // Lấy chữ cái đầu của tên hoặc email
  const rawName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Thành viên';
  const nameParts = rawName.trim().split(/\s+/);
  const userName = nameParts.length > 1 
    ? `${nameParts[nameParts.length - 1]} ${nameParts[0]}` 
    : rawName;
  const userInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || rawName.charAt(0).toUpperCase() || '?';

  return (
    <aside className="w-64 shrink-0 bg-bg-secondary border-r border-border-primary flex flex-col h-full relative">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10">
            <img src="/logo.svg" alt="TrendFit Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">TrendFit</h1>
            <p className="text-[10px] text-[#a3e635] font-semibold tracking-widest uppercase">Thành viên Fitness</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-text-secondary hover:text-text-primary">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-4 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredMenuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? 'bg-[#a3e635] text-black font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-border-primary'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.badgeColor || 'bg-[#ff5e00] text-white'}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border-primary text-text-tertiary">
        <div className="bg-bg-tertiary rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-text-secondary">Lượng nước uống</span>
          </div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 flex-1 bg-bg-quaternary rounded-md"></div>
            ))}
          </div>
          <p className="text-xs">0/5 Liters</p>
        </div>

        {isLoggedIn ? (
          <div className="relative">
            {/* Settings Popover */}
            {isSettingsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsSettingsOpen(false)}
                />
                <div className="absolute bottom-full left-0 w-full mb-2 bg-bg-tertiary border border-border-primary rounded-2xl shadow-2xl p-2 z-20 animate-in slide-in-from-bottom-2 duration-200">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-quaternary rounded-xl transition-colors">
                    <User className="w-4 h-4" />
                    Cài đặt tài khoản
                  </button>
                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Đăng xuất
                  </button>
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <div 
                className="flex items-center gap-3 px-2 cursor-pointer hover:bg-bg-tertiary rounded-xl p-1 transition-colors overflow-hidden"
                onClick={onProfileClick}
              >
                <div className="w-10 h-10 rounded-full bg-[#a3e635] flex items-center justify-center text-black font-bold shrink-0 shadow-lg shadow-[#a3e635]/10">
                  {userInitial}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-text-primary truncate">{userName}</p>
                  <p className="text-xs text-text-tertiary flex items-center gap-1">
                    <Flame className="w-3 h-3 text-[#ff5e00]" /> 1 ngày liên tiếp
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`p-2 rounded-lg ml-auto transition-colors ${isSettingsOpen ? 'bg-[#a3e635] text-black' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary'}`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => openAuthModal()}
            className="w-full bg-[#a3e635] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#bef264] transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Đăng nhập
          </button>
        )}
      </div>
    </aside>
  );
}

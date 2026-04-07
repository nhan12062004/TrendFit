import { Home, Activity, Utensils, Timer, Target, Trophy, Settings, Dumbbell, Droplet, Flame, Shield, Calculator, TrendingUp, X, Zap, Blocks, Brain, LogIn } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

const menuItems = [
  { icon: Home, label: 'Overview', path: '/overview' },
  { icon: Brain, label: 'Smart Planner', path: '/smart-planner', badge: 'New', badgeColor: 'bg-orange-500 text-white' },
  { icon: Dumbbell, label: 'Exercises', path: '/exercises' },
  { icon: Utensils, label: 'Diet Plan', path: '/diet-plan' },
  { icon: Timer, label: 'Workout Timer', path: '/workout-timer' },
  { icon: Target, label: 'Goals', path: '/goals' },
  { icon: Trophy, label: 'Achievements', badge: '2', badgeColor: 'bg-[#a3e635] text-black', path: '/achievements' },
  { icon: Blocks, label: 'Workout Builder', path: '/workout-builder' },
  { icon: TrendingUp, label: 'Progress', path: '/progress' },
  { icon: Shield, label: 'Admin Panel', path: '/admin-panel' },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { isLoggedIn, login, user } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-bg-secondary border-r border-border-primary flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#a3e635] p-2 rounded-xl">
            <Zap className="w-6 h-6 text-black fill-black" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">TrendFit</h1>
            <p className="text-[10px] text-[#a3e635] font-semibold tracking-widest uppercase">Member Fitness</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-text-secondary hover:text-text-primary">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-4 space-y-1">
        {menuItems.map((item, index) => (
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

      <div className="p-4 border-t border-border-primary">
        <div className="bg-bg-tertiary rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-text-secondary">Water Intake</span>
          </div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 flex-1 bg-bg-quaternary rounded-md"></div>
            ))}
          </div>
          <p className="text-xs text-text-tertiary">0/5 Liters</p>
        </div>

        {isLoggedIn ? (
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-bg-quaternary flex items-center justify-center text-[#a3e635] font-bold">
              {user?.initial}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
              <p className="text-xs text-text-tertiary flex items-center gap-1">
                <Flame className="w-3 h-3 text-[#ff5e00]" /> 1 day streak
              </p>
            </div>
            <Settings className="w-4 h-4 text-text-tertiary ml-auto cursor-pointer hover:text-text-primary" />
          </div>
        ) : (
          <button 
            onClick={login}
            className="w-full bg-[#a3e635] text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#bef264] transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Log in
          </button>
        )}
      </div>
    </aside>
  );
}

import { Home, Activity, Utensils, Timer, Target, Trophy, Settings, Dumbbell, Droplet, Flame, Shield, Calculator, TrendingUp, X, Zap, Blocks, Brain, LogIn, LogOut, User, Send, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useState, useEffect } from 'react';
import AuthModal from './components/AuthModal';
import { supabase } from './lib/supabase';
import { useTranslation } from 'react-i18next';

const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const getDatePartsInTimeZone = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return { year, month, day };
};

const getVietnamDateKey = (date = new Date()): string => {
  const { year, month, day } = getDatePartsInTimeZone(date, VIETNAM_TIMEZONE);
  return `${year}-${month}-${day}`;
};

const addDaysToDateKey = (dateKey: string, days: number): string => {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return getVietnamDateKey(d);
};

const calculateWorkoutStreak = (completedDateKeys: string[], todayKey: string): number => {
  const completedSet = new Set(completedDateKeys);
  let streak = 0;
  let cursor = todayKey;

  if (!completedSet.has(cursor)) {
    cursor = addDaysToDateKey(cursor, -1);
  }

  while (completedSet.has(cursor)) {
    streak += 1;
    cursor = addDaysToDateKey(cursor, -1);
  }

  return streak;
};

export default function Sidebar({ onClose, onProfileClick, onPasswordClick }: { 
  onClose?: () => void, 
  onProfileClick?: () => void,
  onPasswordClick?: () => void 
}) {
  const { isLoggedIn, signOut, user, openAuthModal, isAdmin, profile, refreshProfile, refreshTick } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const { t } = useTranslation();
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2.5);
  const [streakDays, setStreakDays] = useState(0);

  const fetchWater = async () => {
    if (!user) return;
    const today = getVietnamDateKey();
    const { data: log } = await supabase
      .from('daily_progress_logs')
      .select('water_intake_ml')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .maybeSingle();

    const { data: lifestyle } = await supabase
      .from('lifestyle_settings')
      .select('daily_water_goal')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: completedDays } = await supabase
      .from('daily_exercise_sessions')
      .select('log_date')
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('log_date', { ascending: false })
      .limit(180);

    if (log) setWaterIntake((log.water_intake_ml || 0) / 1000);
    if (lifestyle) setWaterGoal(lifestyle.daily_water_goal || 2.5);
    if (completedDays) {
      const completedDateKeys = Array.from(
        new Set(completedDays.map((row: any) => String(row.log_date || '')).filter(Boolean))
      );
      setStreakDays(calculateWorkoutStreak(completedDateKeys, today));
    } else {
      setStreakDays(0);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchWater();
    } else {
      setStreakDays(0);
    }
  }, [isLoggedIn, user, refreshTick]);

  const menuItems = [
    { icon: Home, label: t('sidebar.overview', 'Tổng quan'), path: '/overview' },
    { icon: Brain, label: t('sidebar.ai_planner', 'Lập kế hoạch AI'), path: '/smart-planner', badge: t('common.new', 'Mới'), badgeColor: 'bg-orange-500 text-white' },
    { icon: Dumbbell, label: t('sidebar.exercises', 'Bài tập'), path: '/exercises' },
    { icon: Utensils, label: t('sidebar.diet', 'Chế độ ăn'), path: '/diet-plan' },
    { icon: Timer, label: t('sidebar.timer', 'Đồng hồ bấm giờ'), path: '/workout-timer' },
    { icon: Target, label: t('sidebar.goals', 'Mục tiêu'), path: '/goals' },
    { icon: Trophy, label: t('sidebar.achievements', 'Thành tích'), badge: '2', badgeColor: 'bg-[#a3e635] text-black', path: '/achievements' },
    { icon: Blocks, label: t('sidebar.creator', 'Tạo bài tập'), path: '/workout-builder' },
    { icon: TrendingUp, label: t('sidebar.progress', 'Tiến độ'), path: '/progress' },
    { icon: Shield, label: t('sidebar.admin', 'Quản trị viên'), path: '/admin-panel', adminOnly: true },
  ];

  const handleUnlinkTelegram = async () => {
    if (!confirm(t('sidebar.unlink_tg_confirm', 'Bạn có chắc chắn muốn hủy liên kết với Telegram Bot không?'))) return;
    
    setIsUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ telegram_chat_id: null })
        .eq('id', user?.id);

      if (error) throw error;
      await refreshProfile();
      alert(t('sidebar.unlink_tg_success', 'Đã hủy liên kết Telegram thành công'));
    } catch (err: any) {
      alert(t('common.error', 'Lỗi: ') + err.message);
    } finally {
      setIsUnlinking(false);
      setIsSettingsOpen(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => !item.adminOnly || isAdmin);

  const rawName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('common.member', 'Thành viên');
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
            <p className="text-[10px] text-[#a3e635] font-semibold tracking-widest uppercase">{t('common.fitness_member', 'Thành viên Fitness')}</p>
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
        <div 
          className="bg-bg-tertiary rounded-xl p-4 mb-4 transition-colors group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-text-secondary">{t('sidebar.water_intake', 'Lượng nước uống')}</span>
            </div>
            <span className="text-[10px] text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">+250ml</span>
          </div>
          <div className="flex flex-wrap gap-1 mb-2">
            {Array.from({ length: Math.max(Math.ceil(waterGoal / 0.25), Math.floor(waterIntake / 0.25) + 1) }).map((_, idx) => {
              const i = idx + 1;
              const cupSize = 0.25;
              const isFilled = waterIntake >= i * cupSize;
              const isNext = !isFilled && waterIntake >= (i - 1) * cupSize;
              const isExtra = i * cupSize > waterGoal;
              
              return (
                <div 
                  key={i} 
                  onClick={async () => {
                    if (!isLoggedIn) return;
                    const newIntake = i * cupSize;
                    const today = getVietnamDateKey();
                    const { error } = await supabase
                      .from('daily_progress_logs')
                      .upsert({ 
                        user_id: user?.id, 
                        log_date: today, 
                        water_intake_ml: newIntake * 1000 
                      }, { onConflict: 'user_id,log_date' });
                    
                    if (!error) {
                      setWaterIntake(newIntake);
                      refreshProfile();
                    }
                  }}
                  className={`h-6 w-6 rounded-md cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 ${
                    isFilled 
                      ? isExtra ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-blue-500 shadow-sm shadow-blue-500/20'
                      : isNext ? 'bg-blue-500/20 animate-pulse' : 'bg-bg-primary'
                  }`}
                  title={isExtra ? t('sidebar.extra_cup', 'Cốc uống thêm') : undefined}
                />
              );
            })}
          </div>
          <p className="text-xs font-medium text-text-primary">
            {waterIntake.toFixed(2)}/{waterGoal} {t('sidebar.liters', 'Liters')}
          </p>
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
                  <button 
                    onClick={() => {
                      setIsSettingsOpen(false);
                      onPasswordClick?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-quaternary rounded-xl transition-colors"
                  >
                    <User className="w-4 h-4" />
                    {t('sidebar.change_password', 'Đổi mật khẩu')}
                  </button>
                  {profile?.telegram_chat_id ? (
                    <div className="flex items-center justify-between px-3 py-2 mt-1 bg-[#a3e635]/10 rounded-xl group/tg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[#a3e635] font-bold uppercase">Telegram</span>
                          <span className="text-[9px] text-text-tertiary">{t('sidebar.connected', 'Đã kết nối')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={handleUnlinkTelegram}
                        disabled={isUnlinking}
                        className="p-1.5 hover:bg-red-500/10 text-text-tertiary hover:text-red-500 rounded-lg transition-all opacity-0 group-hover/tg:opacity-100"
                        title={t('sidebar.unlink', 'Hủy liên kết')}
                      >
                        {isUnlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsSettingsOpen(false);
                        window.open(`https://t.me/trendfitforbot?start=${user?.id}`, '_blank');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-[#24A1DE] hover:bg-[#24A1DE]/5 rounded-xl transition-colors mt-1"
                    >
                      <Send className="w-4 h-4" />
                      {t('sidebar.connect_tg', 'Kết nối Telegram Bot')}
                    </button>
                  )}
                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout', 'Đăng xuất')}
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
                    <Flame className="w-3 h-3 text-[#ff5e00]" /> {streakDays} {t('sidebar.streak_days', 'ngày liên tiếp')}
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
            {t('common.login', 'Đăng nhập')}
          </button>
        )}
      </div>
    </aside>
  );
}

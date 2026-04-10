import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import AuthModal from '../components/AuthModal';
import VerificationSuccessModal from '../components/VerificationSuccessModal';
import LoadingScreen from '../components/LoadingScreen';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  profile: any | null;
  hasProfile: boolean;
  isCheckingProfile: boolean;
  userRole: string | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  refreshProfile: () => Promise<void>;
  refreshTick: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const checkProfile = async (userId: string) => {
    setIsCheckingProfile(true);
    try {
      // 1. Lấy thông tin cơ bản từ profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // 2. Kiểm tra xem đã hoàn thành survey chưa (lifestyle_settings tồn tại)
      const { data: lifestyleData } = await supabase
        .from('lifestyle_settings')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      setProfile(profileData || null);
      // hasProfile chỉ là true khi ĐÃ CÓ profile và ĐÃ HOÀN THÀNH survey
      setHasProfile(!!profileData && !!lifestyleData);
      setUserRole(profileData?.role || 'user');
    } catch (error) {
      console.error('Error checking profile/survey status:', error);
      setProfile(null);
      setHasProfile(false);
    } finally {
      setIsCheckingProfile(false);
    }
  };

  useEffect(() => {
    // Kiểm tra URL hash để nhận diện xác thực email thành công
    const handleInitialHash = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);

      // Supabase thường gửi kèm access_token trong hash sau khi verify email
      if (hash.includes('access_token=') && (hash.includes('type=signup') || hash.includes('type=recovery'))) {
        setIsVerifying(true);
        // Xóa hash để URL sạch hơn
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Hoặc kiểm tra qua query params nếu có cấu hình khác
      if (searchParams.get('verified') === 'true') {
        setIsVerifying(true);
      }
    };

    handleInitialHash();

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
        setIsCheckingProfile(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        checkProfile(currentUser.id);
        setIsAuthModalOpen(false);
      } else {
        setHasProfile(false);
        setUserRole(null);
        setIsCheckingProfile(false);
      }
    });

    let realtimeChannel: any = null;
    
    const setupRealtime = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      realtimeChannel = supabase.channel('realtime_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_progress_logs', filter: `user_id=eq.${session.user.id}` }, () => {
          setRefreshTick(prev => prev + 1);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_exercise_sessions', filter: `user_id=eq.${session.user.id}` }, () => {
          setRefreshTick(prev => prev + 1);
        })
        .subscribe();
    }
    
    setupRealtime();

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const refreshProfile = async () => {
    if (user) {
      await checkProfile(user.id);
      setRefreshTick(prev => prev + 1);
    }
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!user,
      user,
      profile,
      hasProfile,
      isCheckingProfile,
      userRole,
      isAdmin: userRole === 'admin',
      signOut,
      openAuthModal,
      closeAuthModal,
      refreshProfile,
      refreshTick
    }}>
      {loading ? <LoadingScreen fullScreen /> : children}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
      <VerificationSuccessModal
        isOpen={isVerifying}
        onClose={() => setIsVerifying(false)}
        onLoginClick={() => {
          setIsVerifying(false);
          // User thường đã được tự động đăng nhập bởi Supabase sau khi click email
          // Nếu chưa, ta mở modal login
          if (!user) openAuthModal();
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

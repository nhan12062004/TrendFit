import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import AuthModal from '../components/AuthModal';

interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
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
  const [hasProfile, setHasProfile] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const checkProfile = async (userId: string) => {
    setIsCheckingProfile(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single();
    
    setHasProfile(!!data && !error);
    setUserRole(data?.role || 'user');
    setIsCheckingProfile(false);
  };

  useEffect(() => {
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

    return () => subscription.unsubscribe();
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
      {!loading && children}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
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

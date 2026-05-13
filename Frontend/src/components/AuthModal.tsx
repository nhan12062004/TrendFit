import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsEmailSent(false);
      setError(null);
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isLogin, isOpen]);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
      } else {
        if (password !== confirmPassword) {
          throw new Error(t('auth.password_mismatch', 'Passwords do not match'));
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: window.location.origin, // Đảm bảo redirect về đúng domain hiện tại
          },
        });
        
        if (error) throw error;
        
        if (data.session) {
          // Signup thành công và email confirmation đang tắt
          onClose();
        } else {
          // Thành công và đang đợi xác thực email
          setIsEmailSent(true); 
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setError(null);
    setIsEmailSent(false);
    setIsLogin(true); // Luôn trở lại màn hình đăng nhập
  };

  const handleClose = () => {
    resetFields();
    onClose();
  };

  if (isEmailSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleClose} />
        <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-500">
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-[#a3e635]/20 blur-3xl rounded-full scale-150" />
            <div className="relative w-24 h-24 bg-[#a3e635] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(163,230,53,0.3)]">
              <Mail className="w-12 h-12 text-black" strokeWidth={2.5} />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tight">Check your email!</h2>
          <p className="text-text-secondary mb-10 leading-relaxed">
            We've sent a verification link to<br/>
            <span className="text-[#a3e635] font-semibold">{email}</span>.
            Check your inbox to activate your account.
          </p>
          
          <button 
            onClick={resetFields}
            className="w-full bg-[#a3e635] text-black font-bold py-4 rounded-2xl hover:bg-[#bef264] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#a3e635]/10"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary p-2 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              {isLogin ? 'Welcome Back' : 'Join TrendFit'}
            </h2>
            <p className="text-sm text-text-secondary">
              {isLogin ? 'Log in to your account' : 'Create your fitness profile today'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#a3e635] outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#a3e635] outline-none transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 pl-11 pr-12 text-sm focus:border-[#a3e635] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary ml-1">{t('auth.confirm_password', 'Confirm Password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 pl-11 pr-12 text-sm focus:border-[#a3e635] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-[#a3e635] text-black font-bold py-3 rounded-xl hover:bg-[#bef264] transition-colors flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Log In' : 'Sign Up'}
                </>
              )}
            </button>
          </form>



          <div className="mt-8 pt-6 border-t border-border-primary text-center">
            {isLogin ? (
              <p className="text-xs text-text-tertiary font-medium">
                {t('auth.no_account', "Don't have an account?")}{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="font-bold text-text-secondary hover:text-[#a3e635] transition-colors"
                >
                  {t('auth.signup', 'Sign Up')}
                </button>
              </p>
            ) : (
              <p className="text-xs text-text-tertiary font-medium">
                {t('auth.has_account', 'Already have an account?')}{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="font-bold text-text-secondary hover:text-[#a3e635] transition-colors"
                >
                  {t('auth.login', 'Log In')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

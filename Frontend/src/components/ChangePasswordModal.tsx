import React, { useState } from 'react';
import { Lock, ShieldCheck, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!user?.email) {
      setMessage({ type: 'error', text: t('auth.change_password.errors.email_not_found') });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: t('auth.change_password.errors.password_too_short') });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('auth.change_password.errors.password_mismatch') });
      return;
    }

    setLoading(true);
    try {
      // BƯỚC 1: Xác thực mật khẩu cũ bằng cách thử đăng nhập lại
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword
      });

      if (authError) {
        throw new Error(t('auth.change_password.errors.incorrect_old_password'));
      }

      // BƯỚC 2: Cập nhật mật khẩu mới
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: t('auth.change_password.success') });
      setTimeout(() => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || t('auth.change_password.errors.generic') });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-[2rem] shadow-2xl overflow-hidden p-6 md:p-8 animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-white/10 rounded-xl transition-colors text-text-tertiary hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-[#a3e635]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#a3e635]/20">
            <Lock className="w-8 h-8 text-[#a3e635]" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('auth.change_password.title')}</h2>
          <p className="text-xs text-text-secondary mt-1">{t('auth.change_password.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">{t('auth.change_password.old_password')}</label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 text-sm outline-none focus:border-red-500/50 text-white pr-12"
                placeholder={t('auth.change_password.placeholders.old_password')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">{t('auth.change_password.new_password')}</label>
            <div className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 text-sm outline-none focus:border-[#a3e635] text-white pr-12"
                placeholder={t('auth.change_password.placeholders.new_password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider ml-1">{t('auth.change_password.confirm_password')}</label>
            <input
              required
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 px-4 text-sm outline-none focus:border-[#a3e635] text-white"
              placeholder={t('auth.change_password.placeholders.confirm_password')}
            />
          </div>

          {message.text && (
            <div className={`p-3 rounded-xl text-xs font-medium text-center ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
              {message.type === 'success' && <ShieldCheck className="w-4 h-4 inline-block mr-2" />}
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#a3e635] text-black font-black py-3 rounded-xl hover:bg-[#bef264] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#a3e635]/10 mt-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.change_password.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

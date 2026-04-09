import React from 'react';
import { CheckCircle2, Home, LogIn, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VerificationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick: () => void;
}

export default function VerificationSuccessModal({ isOpen, onClose, onLoginClick }: VerificationSuccessModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in slide-in-from-bottom-8 duration-500">
        <div className="p-10 text-center">
          {/* Animated Icon */}
          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 bg-[#a3e635]/20 blur-3xl rounded-full scale-150" />
            <div className="relative w-24 h-24 bg-[#a3e635] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(163,230,53,0.3)] animate-bounce-subtle">
              <CheckCircle2 className="w-12 h-12 text-black" strokeWidth={2.5} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-text-primary mb-4 tracking-tight">
            {t('auth.verification.success_title', 'Email verified!')}
          </h2>
          <p className="text-text-secondary mb-10 leading-relaxed max-w-[280px] mx-auto">
            {t('auth.verification.success_desc', 'Your account has been successfully verified. You are now ready to start your fitness journey.')}
          </p>

          <div className="grid gap-4">
            <button
              onClick={onLoginClick}
              className="w-full bg-[#a3e635] text-black font-bold py-4 rounded-2xl hover:bg-[#bef264] transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group shadow-lg shadow-[#a3e635]/10"
            >
              <LogIn className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              {t('auth.login', 'Log In')}
              <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>

            <button
              onClick={onClose}
              className="w-full bg-bg-tertiary text-text-secondary font-bold py-4 rounded-2xl border border-border-primary hover:bg-bg-primary hover:text-text-primary transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              {t('nav.home', 'Go to Home')}
            </button>
          </div>
        </div>

        {/* Bottom Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-transparent via-[#a3e635]/30 to-transparent" />
      </div>
    </div>
  );
}

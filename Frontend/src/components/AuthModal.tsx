import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Github, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-bg-secondary border border-border-primary rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-bg-tertiary border border-border-primary rounded-xl py-3 pl-11 pr-4 text-sm focus:border-[#a3e635] outline-none transition-colors"
                />
              </div>
            </div>

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

          <div className="mt-8 text-center">
            <p className="text-xs text-text-tertiary underline mb-4">Or continue with</p>
            <div className="flex gap-4">
              <button className="flex-1 bg-bg-tertiary hover:bg-bg-quaternary border border-border-primary py-2 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Github className="w-4 h-4" />
                <span className="text-xs font-semibold">GitHub</span>
              </button>
              <button className="flex-1 bg-bg-tertiary hover:bg-bg-quaternary border border-border-primary py-2 rounded-xl flex items-center justify-center gap-2 transition-colors">
                <img src="https://www.google.com/favicon.ico" className="w-3 h-3 grayscale" alt="Google" />
                <span className="text-xs font-semibold">Google</span>
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-primary text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-bold text-text-secondary hover:text-[#a3e635] transition-colors"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

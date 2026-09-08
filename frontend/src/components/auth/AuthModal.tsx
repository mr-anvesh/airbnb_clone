'use client';

import { useState } from 'react';
import { X, Loader2, Eye, EyeOff } from 'lucide-react';
import { login, signup } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export default function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const { setAuth } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'GUEST' as 'GUEST' | 'HOST',
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let data;
      if (mode === 'login') {
        data = await login({ email: form.email, password: form.password });
      } else {
        data = await signup({ name: form.name, email: form.email, password: form.password, role: form.role });
      }
      setAuth(data);
      showToast(mode === 'login' ? 'Welcome back!' : 'Account created!', 'success');
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full border border-border-strong rounded-[8px] px-4 py-3.5 text-sm text-ink outline-none focus:border-ink transition-colors bg-canvas placeholder:text-muted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-canvas rounded-[14px] w-full max-w-[480px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-hairline-soft">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-soft transition-colors text-ink">
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-ink">
            {mode === 'login' ? 'Log in' : 'Sign up'}
          </h2>
          <div className="w-6" />
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <h3 className="text-[22px] font-semibold text-ink mb-6">
            Welcome to Airbnb
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="First and last name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                className={inputClass}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              className={inputClass}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={6}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'signup' && (
              <div className="border border-[#b0b0b0] dark:border-[#555555] rounded-[8px] overflow-hidden">
                <div className="px-4 py-2 text-xs text-[#6a6a6a] dark:text-[#a8a8a8] font-bold uppercase tracking-wider border-b border-[#ebebeb] dark:border-[#2d2d2d] bg-transparent">
                  I want to
                </div>
                <div className="grid grid-cols-2 divide-x divide-[#ebebeb] dark:divide-[#2d2d2d]">
                  {(['GUEST', 'HOST'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => set('role', r)}
                      className={`py-3.5 text-sm font-medium transition-colors ${
                        form.role === r
                          ? 'bg-[#222222] dark:bg-[#f2f2f2] text-white dark:text-[#222222] font-semibold'
                          : 'text-[#6a6a6a] dark:text-[#a8a8a8] hover:bg-[#f7f7f7] dark:hover:bg-[#2c2c2c]'
                      }`}
                    >
                      {r === 'GUEST' ? 'Book stays' : 'Host my place'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#e61e4d] to-[#ff385c] hover:from-[#d01343] hover:to-[#e00b41] text-white font-semibold rounded-[8px] py-3.5 text-base transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {mode === 'login' ? 'Continue' : 'Agree and continue'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-sm text-ink">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            </span>
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-sm font-semibold text-ink underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>

          {mode === 'login' && (
            <div className="mt-4 p-3 bg-surface-soft rounded-[8px] text-xs text-muted">
              <strong className="text-ink">Demo accounts:</strong> priya@example.com (Host) · vikram@example.com (Guest)<br />
              Password: <strong className="text-ink">password123</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

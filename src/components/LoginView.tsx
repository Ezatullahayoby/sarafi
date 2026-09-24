import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  ArrowLeft,
  Coins,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  onLoginSuccess: () => void;
  exchangeName?: string;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, exchangeName = 'صرافی و خدمات پولی' }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Initialize root admin if first load
  useEffect(() => {
    AuthService.initializeRootAdmin();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    if (!username.trim()) {
      setErrorMessage('لطفاً نام کاربری را وارد کنید.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('لطفاً رمز عبور را وارد کنید.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      const res = AuthService.login(username, password);
      setIsLoading(false);

      if (res.success) {
        onLoginSuccess();
      } else {
        setErrorMessage(res.error || 'ورود ناموفق بود.');
        if (res.remainingSeconds && res.remainingSeconds > 0) {
          setLockoutSeconds(res.remainingSeconds);
        }
      }
    }, 350);
  };

  const handleFillAdminQuick = () => {
    setUsername('adminsaraf');
    setPassword('admin2026@');
    setErrorMessage('');
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white"
      dir="rtl"
    >
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100/20 overflow-hidden relative z-10 backdrop-blur-md">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="w-16 h-16 mx-auto bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl flex items-center justify-center shadow-inner mb-4">
            <Coins className="w-8 h-8 text-emerald-300" />
          </div>
          <h1 className="text-xl font-black tracking-tight">{exchangeName}</h1>
          <p className="text-xs text-emerald-100/80 mt-1 font-medium">سامانه یکپارچه حسابداری و مدیریت ارزی صرافی</p>

          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-emerald-100">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            <span>پایگاه داده امن و رمزنگاری‌شده فایربیس</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">{errorMessage}</div>
                {lockoutSeconds > 0 && (
                  <div className="text-[11px] text-rose-700 flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>زمان باقیمانده تا رفع انسداد: {lockoutSeconds} ثانیه</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">نام کاربری (Username)</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading || lockoutSeconds > 0}
                  placeholder="مثال: adminsaraf یا ahmad01"
                  className="w-full pr-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none disabled:opacity-60"
                  autoFocus
                  autoComplete="username"
                  dir="ltr"
                />
                <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">رمز عبور (Password)</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || lockoutSeconds > 0}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none disabled:opacity-60"
                  autoComplete="current-password"
                  dir="ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || lockoutSeconds > 0}
              className="w-full mt-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ورود به سامانه صرافی</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Initial Super Admin Quick Help Box */}
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                حساب اولیه مدیر کل (Super Admin):
              </span>
              <button
                type="button"
                onClick={handleFillAdminQuick}
                className="text-[10px] text-amber-700 hover:text-amber-900 underline font-semibold cursor-pointer"
              >
                تکمیل خودکار
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono bg-white/80 px-3 py-2 rounded-xl border border-amber-200 text-slate-700">
              <span>
                نام کاربری: <strong className="text-amber-900">adminsaraf</strong>
              </span>
              <span>
                رمز: <strong className="text-amber-900">admin2026@</strong>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              * مدیر کل پس از اولین ورود می‌تواند نام کاربری و رمز عبور خود را در بخش تنظیمات تغییر دهد. کارمندان نیز با مشخصات تعیین‌شده توسط مدیر وارد می‌شوند.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
          تمامی حقوق محفوظ است | صرافی آنلاین و خدمات پولی
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Chrome, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Database,
  Sparkles,
  Laptop
} from 'lucide-react';
import { UserProfile, Website, Category, AppSettings, CloudSyncData } from '../types';
import { authService } from '../services/auth';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile, syncData?: CloudSyncData) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  currentWebsites: Website[];
  currentCategories: Category[];
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  settings,
  onUpdateSettings,
  currentWebsites,
  currentCategories,
  onShowToast
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('demo@winlaunch.local');
  const [password, setPassword] = useState('demo1234');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [syncLocalData, setSyncLocalData] = useState(true);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isDark = settings.theme === 'dark';
  const bgConfig = settings.background || {
    type: 'default',
    color: '#0c121e',
    overlayOpacity: 0.4,
    blur: 0
  };

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
  };

  const handleQuickFill = (demoEmail: string, demoPass: string, demoName?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (demoName) setName(demoName);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      const initialData = syncLocalData ? {
        websites: currentWebsites,
        categories: currentCategories,
        settings
      } : undefined;

      const res = await authService.register(
        name.trim() || cleanEmail.split('@')[0],
        cleanEmail,
        password,
        initialData
      );
      setIsLoading(false);

      if (res.success && res.user) {
        onShowToast(`Account created! Welcome, ${res.user.name}.`, 'success');
        onLoginSuccess(res.user, res.syncData);
      } else {
        setErrorMessage(res.error || 'Failed to create account. Please try again.');
      }
    } else {
      // Login mode
      setIsLoading(true);
      const res = await authService.login(cleanEmail, password);
      setIsLoading(false);

      if (res.success && res.user) {
        onShowToast(`Welcome back, ${res.user.name}!`, 'success');
        onLoginSuccess(res.user, res.syncData);
      } else {
        setErrorMessage(res.error || 'Invalid email or password. Please verify your credentials.');
      }
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col select-none ${
      isDark ? 'text-slate-100' : 'text-slate-800'
    }`}>
      {/* Background Layer */}
      {bgConfig.type === 'default' ? (
        <div className={`fixed inset-0 pointer-events-none -z-10 ${isDark ? 'mica-bg-dark' : 'mica-bg-light'}`} />
      ) : (
        <div 
          className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
          style={{
            backgroundColor: bgConfig.type === 'color' && bgConfig.color?.startsWith('#') ? bgConfig.color : undefined,
            background: bgConfig.type === 'color' && !bgConfig.color?.startsWith('#') ? bgConfig.color : undefined,
          }}
        >
          {(bgConfig.type === 'image' || bgConfig.type === 'preset') && bgConfig.imageUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url("${bgConfig.imageUrl}")`,
                filter: bgConfig.blur && bgConfig.blur > 0 ? `blur(${bgConfig.blur}px)` : undefined,
                transform: bgConfig.blur && bgConfig.blur > 0 ? 'scale(1.05)' : undefined
              }}
            />
          )}
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundColor: isDark 
                ? `rgba(11, 15, 25, ${bgConfig.overlayOpacity ?? 0.45})` 
                : `rgba(248, 250, 252, ${bgConfig.overlayOpacity ?? 0.45})`
            }}
          />
        </div>
      )}

      {/* Windows 11 Top Minimal Title Bar */}
      <header 
        id="login-top-bar"
        className={`h-10 flex items-center justify-between px-4 border-b text-xs backdrop-blur-md z-20 ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800/80 text-slate-300' 
            : 'bg-white/80 border-slate-200/80 text-slate-700'
        }`}
      >
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-xs">
            <Chrome className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold tracking-tight text-sm">WinLaunch</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
          }`}>
            Windows 11 Edition
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px] opacity-75">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>SQLite Offline Engine Active</span>
          </div>

          <button
            id="btn-login-theme-toggle"
            onClick={toggleTheme}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Theme`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Center Windows 11 Login Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div 
          id="login-card-container"
          className={`w-full max-w-md rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 duration-200 ${
            isDark 
              ? 'bg-slate-900/90 border-slate-750/90 text-slate-100 shadow-black/40' 
              : 'bg-white/90 border-slate-200/90 text-slate-800 shadow-slate-300/50'
          }`}
        >
          {/* Card Banner */}
          <div className={`p-6 pb-5 text-center border-b ${
            isDark ? 'border-slate-800/80 bg-slate-850/40' : 'border-slate-100 bg-slate-50/60'
          }`}>
            {/* Glowing Windows Avatar Icon */}
            <div className="relative inline-block mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-0.5 shadow-lg shadow-blue-500/20">
                <div className={`w-full h-full rounded-[14px] flex items-center justify-center ${
                  isDark ? 'bg-slate-900' : 'bg-white'
                }`}>
                  <Lock className="w-7 h-7 text-blue-500" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            </div>

            <h1 className="text-xl font-bold tracking-tight">
              {mode === 'login' ? 'Sign in to WinLaunch' : 'Create WinLaunch Account'}
            </h1>
            <p className={`text-xs mt-1 max-w-xs mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {mode === 'login' 
                ? 'Your persistent session keeps you logged in across app restarts.' 
                : 'Register your account to sync bookmarks and themes across devices.'}
            </p>

            {/* Mode Switcher Tabs */}
            <div className={`mt-4 p-1 rounded-xl grid grid-cols-2 text-xs font-medium border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-200/70 border-slate-300'
            }`}>
              <button
                id="tab-mode-signin"
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`py-1.5 rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-mode-register"
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`py-1.5 rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Quick 1-Click Sign In Banner for Preloaded Account */}
          {mode === 'login' && (
            <div className={`px-6 py-2.5 border-b flex items-center justify-between text-xs ${
              isDark ? 'bg-blue-950/20 border-slate-800/80 text-blue-300' : 'bg-blue-50/70 border-blue-100 text-blue-700'
            }`}>
              <div className="flex items-center space-x-1.5 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Instant Access: demo@winlaunch.local</span>
              </div>
              <button
                id="btn-quick-fill-demo"
                type="button"
                onClick={() => handleQuickFill('demo@winlaunch.local', 'demo1234')}
                className={`px-2 py-0.5 rounded font-medium border text-[11px] shrink-0 transition-colors ${
                  isDark 
                    ? 'bg-blue-600/30 hover:bg-blue-600/50 border-blue-500/40 text-blue-200' 
                    : 'bg-white hover:bg-blue-100 border-blue-200 text-blue-800'
                }`}
              >
                Autofill
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    id="input-register-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Mercer"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-950/60 border-slate-750 text-slate-100 placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Email Address
              </label>
              <div className="relative">
                <Mail className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  id="input-login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-950/60 border-slate-750 text-slate-100 placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  id="input-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full pl-9 pr-10 py-2 rounded-xl text-sm border transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-950/60 border-slate-750 text-slate-100 placeholder-slate-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-2.5 transition-colors ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    id="input-register-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-950/60 border-slate-750 text-slate-100 placeholder-slate-500' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Persistent Login Checkbox / Remember Device */}
            <div className="pt-1">
              <label 
                id="label-remember-login"
                className={`flex items-start space-x-2.5 cursor-pointer p-2.5 rounded-xl border transition-colors ${
                  rememberMe 
                    ? isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200' 
                    : isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <input
                  id="checkbox-remember-session"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 shrink-0"
                />
                <div className="text-xs">
                  <div className="font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Keep me signed in (Persistent Session)</span>
                  </div>
                  <p className={`text-[11px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    You will remain securely logged in across browser closes, app restarts, and system reboots until you explicitly log out.
                  </p>
                </div>
              </label>
            </div>

            {mode === 'register' && (
              <label className="flex items-center space-x-2 text-xs cursor-pointer px-1">
                <input
                  id="checkbox-sync-existing-bookmarks"
                  type="checkbox"
                  checked={syncLocalData}
                  onChange={(e) => setSyncLocalData(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                  Backup current local websites ({currentWebsites.length}) to my new account
                </span>
              </label>
            )}

            {/* Primary Submit Button */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to WinLaunch' : 'Create WinLaunch Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Highlights */}
          <div className={`px-6 py-3.5 border-t text-[11px] grid grid-cols-3 gap-2 text-center ${
            isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50/80 border-slate-100 text-slate-600'
          }`}>
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 mb-1" />
              <span>Persistent Login</span>
            </div>
            <div className="flex flex-col items-center">
              <Database className="w-3.5 h-3.5 text-emerald-400 mb-1" />
              <span>SQLite Offline</span>
            </div>
            <div className="flex flex-col items-center">
              <Laptop className="w-3.5 h-3.5 text-purple-400 mb-1" />
              <span>Multi-Device Sync</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

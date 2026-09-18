import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Laptop,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { UserProfile, Website, Category, AppSettings, CloudSyncData } from '../types';
import { authService } from '../services/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
  onSyncReceived: (syncData: CloudSyncData, mode: 'merge' | 'replace') => void;
  currentWebsites: Website[];
  currentCategories: Category[];
  currentSettings: AppSettings;
  isDark: boolean;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  onSyncReceived,
  currentWebsites,
  currentCategories,
  currentSettings,
  isDark,
  onShowToast,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [syncLocalData, setSyncLocalData] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const result = await authService.login(email.trim(), password, rememberMe);
    setIsLoading(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      onShowToast(`Welcome back, ${result.user.name}!`, 'success');

      if (result.syncData && result.syncData.websites && result.syncData.websites.length > 0) {
        // Apply cloud bookmarks
        onSyncReceived(result.syncData, 'merge');
        onShowToast(`Synced ${result.syncData.websites.length} websites from cloud account`, 'info');
      } else if (currentWebsites.length > 0) {
        // Upload local data to empty cloud profile
        await authService.pushCloudData({
          websites: currentWebsites,
          categories: currentCategories,
          settings: currentSettings
        });
        onShowToast('Synced local bookmarks to your cloud account', 'success');
      }

      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to log in. Please check credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Email and password are required.');
      return;
    }
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
      settings: currentSettings
    } : undefined;

    const result = await authService.register(
      name.trim(),
      email.trim(),
      password,
      initialData,
      rememberMe
    );
    setIsLoading(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      onShowToast(`Account created! Welcome, ${result.user.name}.`, 'success');
      if (syncLocalData) {
        onShowToast('Your local websites are backed up to your cloud account', 'info');
      }
      onClose();
    } else {
      setErrorMessage(result.error || 'Failed to create account.');
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await authService.logout();
    setIsLoading(false);
    onUserChange(null);
    onShowToast('Logged out of cloud account. Local database remains active.', 'info');
    onClose();
  };

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = calculatePasswordStrength(password);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="modal-auth-view"
        className={`w-full max-w-md rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-750 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-850/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {currentUser 
                  ? 'Cloud Account Profile' 
                  : mode === 'login' ? 'Sign In to WinLaunch' : 'Create Cloud Account'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentUser 
                  ? 'Connected to multi-device sync' 
                  : 'Sync bookmarks & wallpapers across Windows devices'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If Already Logged In: Show Account Status & Sync Options */}
        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className={`p-4 rounded-xl border flex items-center space-x-3 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-blue-50/50 border-blue-100'
            }`}>
              <div 
                className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-sm"
                style={{ backgroundColor: currentUser.avatar_color || '#2563eb' }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm truncate">{currentUser.name}</div>
                <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {currentUser.email}
                </div>
                <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Cloud Sync Active</span>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border space-y-2 text-xs ${
              isDark ? 'border-slate-800 bg-slate-850/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}>
              <div className="flex items-center justify-between">
                <span>Saved Websites:</span>
                <span className="font-mono font-semibold">{currentWebsites.length} items</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Created:</span>
                <span className="font-mono">{new Date(currentUser.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Multi-Device Sync:</span>
                <span className="text-emerald-500 font-medium">Automatic</span>
              </div>
            </div>

            <div className="flex flex-col space-y-2 pt-2">
              <button
                onClick={async () => {
                  setIsLoading(true);
                  const res = await authService.pushCloudData({
                    websites: currentWebsites,
                    categories: currentCategories,
                    settings: currentSettings
                  });
                  setIsLoading(false);
                  if (res.success) {
                    onShowToast('Cloud data synchronized successfully', 'success');
                  } else {
                    onShowToast(res.error || 'Failed to sync data', 'warning');
                  }
                }}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync Now to Cloud</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={isLoading}
                className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                  isDark 
                    ? 'border-rose-900/50 text-rose-400 hover:bg-rose-950/30' 
                    : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        ) : (
          /* Authentication Form (Login or Register) */
          <div>
            {/* Tabs for Mode Switch */}
            <div className={`grid grid-cols-2 border-b text-xs font-medium ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`py-3 text-center border-b-2 transition-all ${
                  mode === 'login'
                    ? 'border-blue-500 text-blue-500 font-semibold bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`py-3 text-center border-b-2 transition-all ${
                  mode === 'register'
                    ? 'border-blue-500 text-blue-500 font-semibold bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="p-6 space-y-4">
              {/* Informational Pill */}
              <div className={`p-3 rounded-xl border text-[11px] flex items-start space-x-2 ${
                isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-blue-50/60 border-blue-100 text-slate-600'
              }`}>
                <Laptop className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Log in on any Windows device to access your saved websites, favorites, categories, and custom backgrounds seamlessly.
                </span>
              </div>

              {/* Name field (Register only) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 block">
                    Your Name or Nickname
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex"
                      className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                        isDark 
                          ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500' 
                          : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500' 
                        : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`w-full pl-9 pr-9 py-2 rounded-lg text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500' 
                        : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password strength meter on register */}
                {mode === 'register' && password && (
                  <div className="pt-1">
                    <div className="flex gap-1 h-1">
                      <div className={`flex-1 rounded-full ${strengthScore >= 1 ? 'bg-rose-500' : 'bg-slate-700'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-700'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 3 ? 'bg-blue-500' : 'bg-slate-700'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 4 ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password (Register only) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-400 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className={`w-full pl-9 pr-3 py-2 rounded-lg text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                        isDark 
                          ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500' 
                          : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Extra check options */}
              {mode === 'register' ? (
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={syncLocalData}
                    onChange={(e) => setSyncLocalData(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Sync my existing {currentWebsites.length} local bookmarks to this account</span>
                </label>
              ) : (
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span>Remember me on this Windows device</span>
                </label>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-98 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Sign In to Cloud Account' : 'Create Account & Sync'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {/* Switch link */}
              <div className="text-center pt-2 text-xs">
                {mode === 'login' ? (
                  <span className="text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setErrorMessage(null);
                      }}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMessage(null);
                      }}
                      className="text-blue-500 hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

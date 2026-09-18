import React, { useState, useEffect } from 'react';
import { 
  Minus, 
  Square, 
  X, 
  Sun, 
  Moon, 
  Settings, 
  PackageCheck, 
  Database,
  Chrome,
  Maximize2,
  Palette,
  Cloud,
  User,
  ShieldCheck,
  LogOut,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';

interface TitleBarProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenSettings: () => void;
  onOpenBuildGuide: () => void;
  onOpenBackgroundModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout?: () => void;
  currentUser: UserProfile | null;
  onShowToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  settings,
  onUpdateSettings,
  onOpenSettings,
  onOpenBuildGuide,
  onOpenBackgroundModal,
  onOpenAuthModal,
  onLogout,
  currentUser,
  onShowToast
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isDark = settings.theme === 'dark';

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.onMaximizeChange) {
      const cleanup = window.electronAPI.onMaximizeChange((maximized) => {
        setIsMaximized(maximized);
      });
      return cleanup;
    }
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    } else {
      onShowToast('Simulating Windows Minimize (In browser preview)', 'info');
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.maximizeWindow) {
      window.electronAPI.maximizeWindow();
    } else {
      setIsMaximized(!isMaximized);
      onShowToast(isMaximized ? 'Restored Window' : 'Maximized Window', 'info');
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    } else {
      onShowToast('Windows Close button clicked. (App running in browser)', 'info');
    }
  };

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ theme: nextTheme });
    onShowToast(`Theme changed to ${nextTheme === 'dark' ? 'Windows Dark (Mica)' : 'Windows Light'}`);
  };

  return (
    <header 
      id="app-title-bar"
      className={`h-10 select-none flex items-center justify-between px-3 border-b text-xs transition-colors duration-150 z-50 ${
        isDark 
          ? 'bg-slate-900/90 border-slate-800 text-slate-200' 
          : 'bg-slate-100/95 border-slate-200 text-slate-700'
      }`}
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Left: App Logo & Title */}
      <div className="flex items-center space-x-2.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-xs">
          <Chrome className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-semibold tracking-tight text-sm">WinLaunch</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
            isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
          }`}>
            v1.0.0 Windows
          </span>
        </div>

        {/* SQLite Database Path Badge */}
        <div 
          className={`hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
            isDark ? 'bg-slate-800/80 hover:bg-slate-800 text-emerald-400' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
          }`}
          onClick={onOpenSettings}
          title="SQLite Database active in %APPDATA%\WinLaunch\websites.db"
        >
          <Database className="w-3 h-3 text-emerald-500" />
          <span>SQLite: %APPDATA%\WinLaunch\websites.db</span>
        </div>
      </div>

      {/* Center: Window Title or Quick Status */}
      <div className="hidden lg:flex items-center space-x-2 text-[11px] font-medium opacity-75">
        <span>Target: Google Chrome</span>
        <span>•</span>
        <span>Offline-Ready Launcher</span>
      </div>

      {/* Right: Quick Actions & Windows Control Buttons */}
      <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Windows .exe Packager & Guide Button */}
        <button
          id="btn-build-guide-titlebar"
          onClick={onOpenBuildGuide}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded mr-1.5 text-[11px] font-medium transition-colors ${
            isDark 
              ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
          }`}
          title="Windows .exe Build Guide & Electron Source"
        >
          <PackageCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Windows .exe Build Guide</span>
        </button>

        {/* Change Background Button */}
        <button
          id="btn-change-background-titlebar"
          onClick={onOpenBackgroundModal}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded mr-1.5 text-[11px] font-medium transition-colors ${
            isDark 
              ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30' 
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
          title="Change Desktop Background Wallpaper & Colors"
        >
          <Palette className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Background</span>
        </button>

        {/* Cloud Account / Sign In & Register Pill */}
        {currentUser ? (
          <div className="relative mr-1.5 flex items-center">
            <button
              id="btn-user-account-titlebar"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition-colors border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title={`Logged in as ${currentUser.name} (${currentUser.email}) - Click for account menu`}
            >
              <div 
                className="w-4 h-4 rounded-full text-[10px] text-white flex items-center justify-center font-bold"
                style={{ backgroundColor: currentUser.avatar_color || '#2563eb' }}
              >
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="max-w-[80px] truncate hidden sm:inline">{currentUser.name}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* Quick Log Out Button right on TitleBar */}
            {onLogout && (
              <button
                id="btn-quick-logout-titlebar"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  onLogout();
                }}
                className={`ml-1 p-1 rounded transition-colors text-slate-400 hover:text-red-400 hover:bg-red-500/10`}
                title="Log out of WinLaunch (require login on next launch)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)} 
                />
                <div 
                  id="menu-user-dropdown"
                  className={`absolute right-0 top-full mt-1.5 w-64 rounded-xl border shadow-2xl p-2.5 z-50 text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
                    isDark 
                      ? 'bg-slate-900/95 border-slate-750 text-slate-200 shadow-black/50' 
                      : 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-700/40">
                    <div 
                      className="w-8 h-8 rounded-full text-xs text-white flex items-center justify-center font-bold shrink-0"
                      style={{ backgroundColor: currentUser.avatar_color || '#2563eb' }}
                    >
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{currentUser.name}</div>
                      <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {currentUser.email}
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5 text-[10px] text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Persistent Session Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      id="btn-menu-account-settings"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuthModal('login');
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors ${
                        isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Account & Sync Details</span>
                    </button>

                    <button
                      id="btn-menu-change-background"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenBackgroundModal();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 transition-colors ${
                        isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                      <span>Change Background...</span>
                    </button>
                  </div>

                  {onLogout && (
                    <div className="pt-1.5 border-t border-slate-700/40">
                      <button
                        id="btn-menu-logout"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onLogout();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center space-x-2 text-red-400 hover:bg-red-500/15 transition-colors font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Log Out of WinLaunch</span>
                      </button>
                      <div className={`text-[10px] px-2.5 pt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        After logout, you will be asked to log in again.
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            id="btn-sign-in-titlebar"
            onClick={() => onOpenAuthModal('login')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded mr-1.5 text-[11px] font-medium transition-colors border ${
              isDark 
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
            }`}
            title="Sign In or Create Account to sync bookmarks across Windows devices"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Sign In / Sync</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          id="btn-toggle-theme"
          onClick={toggleTheme}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors mr-0.5 ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Settings Button */}
        <button
          id="btn-open-settings-titlebar"
          onClick={onOpenSettings}
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors mr-2 ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'
          }`}
          title="Settings (Theme, Browser, SQLite, Backup)"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Standard Windows 11 Window Controls */}
        <div className="flex items-center -mr-3">
          <button
            id="btn-window-minimize"
            onClick={handleMinimize}
            className={`w-11 h-10 flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-window-maximize"
            onClick={handleMaximize}
            className={`w-11 h-10 flex items-center justify-center transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? <Maximize2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
          </button>
          <button
            id="btn-window-close"
            onClick={handleClose}
            className="w-11 h-10 flex items-center justify-center transition-colors hover:bg-[#e81123] hover:text-white text-slate-400"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};

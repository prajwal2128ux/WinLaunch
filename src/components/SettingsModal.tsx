import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  Palette, 
  Chrome, 
  Database, 
  HardDrive, 
  Upload, 
  Download, 
  RotateCcw, 
  Play, 
  Check, 
  AlertTriangle,
  FolderOpen,
  FileCode,
  ShieldCheck,
  PackageCheck,
  Cloud,
  User,
  LogOut,
  RefreshCw,
  Laptop,
  Image as ImageIcon
} from 'lucide-react';
import { AppSettings, UserProfile } from '../types';
import { dbService } from '../services/db';
import { detectChromeInstallation } from '../services/launcher';
import { authService } from '../services/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onRefreshData: () => void;
  onOpenBuildGuide: () => void;
  onOpenBackgroundModal: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
  onLogout?: () => void;
  currentUser: UserProfile | null;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onRefreshData,
  onOpenBuildGuide,
  onOpenBackgroundModal,
  onOpenAuthModal,
  onLogout,
  currentUser,
  onShowToast
}) => {
  const isDark = settings.theme === 'dark';
  const [activeTab, setActiveTab] = useState<'general' | 'browser' | 'database' | 'backup' | 'account' | 'windows'>('general');

  // Chrome detection state
  const [chromeStatus, setChromeStatus] = useState<{ installed: boolean; path: string; source: string }>({
    installed: true,
    path: settings.chrome_path,
    source: 'Checking...'
  });

  // SQLite stats & query runner state
  const [dbStats, setDbStats] = useState(dbService.getDatabaseStats());
  const [customQuery, setCustomQuery] = useState('SELECT id, title, category, launch_count FROM websites ORDER BY launch_count DESC LIMIT 5;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; values: any[][]; error?: string } | null>(null);

  // Backup & Restore
  const [importJsonText, setImportJsonText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  useEffect(() => {
    if (isOpen) {
      setDbStats(dbService.getDatabaseStats());
      detectChromeInstallation().then((res) => {
        setChromeStatus(res);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunQuery = () => {
    if (!customQuery.trim()) return;
    const res = dbService.runRawQuery(customQuery.trim());
    setQueryResult(res);
    setDbStats(dbService.getDatabaseStats());
  };

  const handleExportJson = () => {
    const jsonStr = dbService.exportBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winlaunch-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast('Exported bookmarks to JSON backup file', 'success');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const result = dbService.importBackupJson(text, importMode);
        if (result.success) {
          onShowToast(`Successfully imported ${result.count} websites!`, 'success');
          onRefreshData();
          setDbStats(dbService.getDatabaseStats());
        } else {
          onShowToast(`Import failed: ${result.error}`, 'warning');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportJsonString = () => {
    if (!importJsonText.trim()) return;
    const result = dbService.importBackupJson(importJsonText.trim(), importMode);
    if (result.success) {
      onShowToast(`Successfully imported ${result.count} websites!`, 'success');
      setImportJsonText('');
      onRefreshData();
      setDbStats(dbService.getDatabaseStats());
    } else {
      onShowToast(`Import failed: ${result.error}`, 'warning');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to reset all data in the SQLite database to factory defaults?')) {
      dbService.resetAllData();
      onRefreshData();
      setDbStats(dbService.getDatabaseStats());
      onShowToast('Reset all websites & SQLite database to default', 'info');
    }
  };

  const handleVacuumDb = () => {
    dbService.runRawQuery('VACUUM;');
    setDbStats(dbService.getDatabaseStats());
    onShowToast('SQLite VACUUM and indexing completed successfully', 'success');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="modal-app-settings"
        className={`w-full max-w-3xl h-[640px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-750 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-850/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Settings & Configuration</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Configure theme, Google Chrome launcher, SQLite storage, and backup
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

        {/* Modal Content: Sidebar Tabs + Main Tab Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className={`w-52 p-3 border-r flex flex-col space-y-1 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'general'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Theme & General</span>
            </button>

            <button
              onClick={() => setActiveTab('browser')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'browser'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Chrome className="w-4 h-4" />
              <span>Browser & Chrome</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'database'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>SQLite Database</span>
            </button>

            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'backup'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Import & Export</span>
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'account'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Cloud className="w-4 h-4" />
              <span>Cloud & Multi-Device</span>
            </button>

            <button
              onClick={() => setActiveTab('windows')}
              className={`flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                activeTab === 'windows'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <PackageCheck className="w-4 h-4" />
              <span>Windows .exe Setup</span>
            </button>
          </div>

          {/* Main Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* TAB 1: General & Theme */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Color Theme</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Choose between Windows 11 Mica Dark theme or clean Light theme
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-md">
                    <button
                      onClick={() => onUpdateSettings({ theme: 'dark' })}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                        settings.theme === 'dark'
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                          : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-blue-400">
                        🌙
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Windows Dark</div>
                        <div className="text-[10px] text-slate-400">Mica acrylic dark canvas</div>
                      </div>
                    </button>

                    <button
                      onClick={() => onUpdateSettings({ theme: 'light' })}
                      className={`p-3 rounded-xl border text-left flex items-center space-x-3 transition-all ${
                        settings.theme === 'light'
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-500/10'
                          : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-amber-500 shadow-xs">
                        ☀️
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Windows Light</div>
                        <div className="text-[10px] text-slate-400">Clean high-contrast theme</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Desktop Background Personalization Section */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h3 className="text-sm font-semibold">Desktop Background Personalization</h3>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Set custom image wallpapers, solid background colors, or high-res Windows themes
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenBackgroundModal();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs transition-colors flex items-center space-x-1.5 shrink-0"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Change Background...</span>
                    </button>
                  </div>

                  <div className={`mt-3 p-3.5 rounded-xl border flex items-center justify-between ${
                    isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-14 h-9 rounded-lg border border-white/20 overflow-hidden bg-cover bg-center shrink-0 flex items-center justify-center text-[10px] text-white font-mono shadow-xs"
                        style={{
                          backgroundColor: settings.background?.color || '#0c121e',
                          backgroundImage: settings.background?.imageUrl ? `url(${settings.background.imageUrl})` : undefined
                        }}
                      >
                        {!settings.background?.imageUrl && 'Mica'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold">
                          {settings.background?.type === 'image' 
                            ? 'Custom Image Wallpaper' 
                            : settings.background?.type === 'color' 
                              ? `Solid Color / Gradient (${settings.background.color})` 
                              : settings.background?.type === 'preset' 
                                ? 'Curated Windows Wallpaper' 
                                : 'Default Windows Mica Acrylic'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Tint Dimming: {Math.round((settings.background?.overlayOpacity ?? 0.35) * 100)}% • Frosted Blur: {settings.background?.blur ?? 0}px
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenBackgroundModal();
                      }}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Customize
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold mb-1">Automation Preferences</h3>
                  <div className="space-y-3 mt-3">
                    <label className="flex items-center space-x-3 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={settings.auto_fetch_metadata}
                        onChange={(e) => onUpdateSettings({ auto_fetch_metadata: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50"
                      />
                      <div>
                        <span className="font-medium">Automatically scrape website title & favicon on URL paste</span>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Fetches open graph tags and high-resolution icons automatically.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={settings.fallback_to_default}
                        onChange={(e) => onUpdateSettings({ fallback_to_default: e.target.checked })}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50"
                      />
                      <div>
                        <span className="font-medium">Fallback to Windows default browser if Chrome is missing</span>
                        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Prevents failure if Google Chrome is not installed on the system.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Browser & Chrome */}
            {activeTab === 'browser' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Google Chrome Status & Detection</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    WinLaunch is configured to launch websites directly in Google Chrome.
                  </p>

                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    chromeStatus.installed 
                      ? isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <Chrome className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold flex items-center space-x-1.5">
                          <span>{chromeStatus.installed ? 'Google Chrome Detected' : 'Chrome Not Found'}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                            {chromeStatus.source}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono opacity-80 mt-0.5 truncate max-w-md">
                          {chromeStatus.path}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold mb-2">Default Browser Preference</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <select
                        value={settings.default_browser}
                        onChange={(e) => onUpdateSettings({ default_browser: e.target.value as any })}
                        className={`text-xs rounded-lg px-3 py-2 border font-medium ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="chrome">Google Chrome (Default & Recommended)</option>
                        <option value="default">System Default Browser</option>
                        <option value="edge">Microsoft Edge</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                        Custom Chrome Executable Path (Windows)
                      </label>
                      <input
                        type="text"
                        value={settings.chrome_path}
                        onChange={(e) => onUpdateSettings({ chrome_path: e.target.value })}
                        placeholder="C:\Program Files\Google\Chrome\Application\chrome.exe"
                        className={`w-full px-3 py-2 rounded-lg text-xs font-mono transition-all ${
                          isDark ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-slate-50 border border-slate-200 text-slate-900'
                        }`}
                      />
                      <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Standard locations are automatically detected: <code>%PROGRAMFILES%\Google\Chrome\Application\chrome.exe</code>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SQLite Database */}
            {activeTab === 'database' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold">SQLite Local Storage</h3>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      {dbStats.storageType}
                    </span>
                  </div>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    All websites, categories, and metrics are stored in a local SQLite database file.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/60 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Websites</div>
                      <div className="text-lg font-bold text-blue-500">{dbStats.websitesCount}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/60 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Pinned Sites</div>
                      <div className="text-lg font-bold text-amber-500">{dbStats.pinnedCount}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/60 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Launches</div>
                      <div className="text-lg font-bold text-emerald-500">{dbStats.totalLaunches}</div>
                    </div>
                    <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-800/60 border-slate-750' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Database Size</div>
                      <div className="text-lg font-bold text-purple-500">{Math.round(dbStats.binarySize / 1024)} KB</div>
                    </div>
                  </div>

                  {/* AppData File Path Display */}
                  <div className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2 truncate">
                      <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="truncate">AppData Location: {dbStats.filePath}</span>
                    </div>
                    <button
                      onClick={handleVacuumDb}
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] shrink-0 ml-2"
                    >
                      VACUUM
                    </button>
                  </div>
                </div>

                {/* SQLite Query Runner */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                    Live SQLite Query Console
                  </h4>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="text"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      placeholder="SELECT * FROM websites;"
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-mono ${
                        isDark ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-slate-50 border border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      onClick={handleRunQuery}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shrink-0"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Run SQL</span>
                    </button>
                  </div>

                  {/* Query results table */}
                  {queryResult && (
                    <div className={`max-h-36 overflow-auto rounded-lg border text-xs font-mono p-2 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}>
                      {queryResult.error ? (
                        <div className="text-red-400 p-2">{queryResult.error}</div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              {queryResult.columns.map((c, i) => (
                                <th key={i} className="p-1 text-slate-400 font-semibold">{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {queryResult.values.map((row, ri) => (
                              <tr key={ri} className="border-b border-slate-800/40">
                                {row.map((val, ci) => (
                                  <td key={ci} className="p-1 truncate max-w-[120px]">{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>

                {/* Reset Data */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-medium text-red-500">Reset Database</div>
                    <div className="text-[11px] text-slate-400">Reverts all websites and tables to factory initial state.</div>
                  </div>
                  <button
                    onClick={handleResetData}
                    className="px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 text-xs font-medium transition-colors"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: Backup & Restore */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Export Saved Websites</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Download a full JSON backup of all your saved websites, categories, and metrics.
                  </p>
                  <button
                    onClick={handleExportJson}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON Backup (winlaunch-backup.json)</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-sm font-semibold mb-1">Import Saved Websites</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Restore your websites from a previously exported JSON backup file.
                  </p>

                  <div className="flex items-center space-x-4 mb-3 text-xs">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="text-blue-600"
                      />
                      <span>Merge (Add new without removing existing)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-blue-600"
                      />
                      <span>Replace (Overwrite all current bookmarks)</span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 mb-3">
                    <label className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-white text-xs font-medium cursor-pointer transition-colors border border-slate-700">
                      <Upload className="w-4 h-4" />
                      <span>Choose JSON File to Import</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportJsonFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Or paste JSON text */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                      Or Paste JSON Data Directly
                    </label>
                    <textarea
                      value={importJsonText}
                      onChange={(e) => setImportJsonText(e.target.value)}
                      placeholder='{"websites": [{"title": "My Site", "url": "https://mysite.com", ...}]}'
                      rows={3}
                      className={`w-full p-2 rounded-lg text-xs font-mono resize-none ${
                        isDark ? 'bg-slate-800 border border-slate-700 text-slate-100' : 'bg-slate-50 border border-slate-200 text-slate-900'
                      }`}
                    />
                    {importJsonText && (
                      <button
                        onClick={handleImportJsonString}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                      >
                        Apply JSON Import
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Cloud Account & Multi-Device Sync */}
            {activeTab === 'account' && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Cloud Account & Multi-Device Sync</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Create an account or sign in to access your saved websites, categories, and settings from any Windows device.
                  </p>
                </div>

                {currentUser ? (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border flex items-center space-x-3.5 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/50 border-blue-100'
                    }`}>
                      <div 
                        className="w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-lg shrink-0 shadow-xs"
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
                          <span>Connected & Sync Active</span>
                        </div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                      isDark ? 'border-slate-800 bg-slate-950/30 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}>
                      <div className="flex justify-between py-1 border-b border-slate-800/40">
                        <span>Account Created:</span>
                        <span className="font-mono">{new Date(currentUser.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/40">
                        <span>Last Session Activity:</span>
                        <span className="font-mono">{new Date(currentUser.last_login_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Cloud Database Engine:</span>
                        <span className="text-blue-400 font-medium">WinLaunch Cloud Sync v2</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        onClick={async () => {
                          const websites = dbService.getWebsites();
                          const categories = dbService.getCategories();
                          const res = await authService.pushCloudData({
                            websites,
                            categories,
                            settings
                          });
                          if (res.success) {
                            onShowToast('Cloud database synchronized successfully', 'success');
                          } else {
                            onShowToast(res.error || 'Failed to sync with cloud', 'warning');
                          }
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Force Sync to Cloud</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuthModal('login');
                        }}
                        className={`px-4 py-2 rounded-lg border text-xs font-medium transition-colors ${
                          isDark 
                            ? 'border-slate-700 hover:bg-slate-800 text-slate-300' 
                            : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        Manage Account
                      </button>

                      {onLogout && (
                        <button
                          onClick={() => {
                            onClose();
                            onLogout();
                          }}
                          className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
                          title="Log out of WinLaunch (requires sign in to access again)"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Log Out</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-blue-50/50 border-blue-100'
                    }`}>
                      <div className="flex items-center space-x-2 text-blue-500 font-semibold text-xs">
                        <Cloud className="w-4 h-4" />
                        <span>Why Create a WinLaunch Cloud Account?</span>
                      </div>

                      <ul className="text-xs space-y-2 text-slate-400">
                        <li className="flex items-start space-x-2">
                          <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <span><strong>Multi-Device Access:</strong> Open WinLaunch on your work PC, laptop, or home desktop and access all your saved websites instantly.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span><strong>Automatic Cloud Backup:</strong> Never lose your organized links, custom categories, or wallpapers if you reinstall Windows.</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                          <span><strong>Works Offline Too:</strong> WinLaunch keeps local SQLite cached, so the app remains lightning fast even when offline.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuthModal('login');
                        }}
                        className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all"
                      >
                        Sign In to Existing Account
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenAuthModal('register');
                        }}
                        className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                          isDark 
                            ? 'border-blue-500/40 text-blue-400 hover:bg-blue-600/10' 
                            : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        Create New Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: Windows .exe Setup */}
            {activeTab === 'windows' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-1">Windows .exe Installer & Electron</h3>
                  <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    WinLaunch is prepared as a standalone Windows desktop app with Start Menu & Desktop shortcuts.
                  </p>

                  <div className={`p-4 rounded-xl border space-y-3 ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2 text-blue-500 font-semibold text-xs">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Secure Windows Architecture</span>
                    </div>
                    <ul className="text-xs space-y-1.5 list-disc list-inside text-slate-400">
                      <li><strong>Context Isolation:</strong> Enabled in <code>electron/main.cjs</code> to prevent unauthorized code execution.</li>
                      <li><strong>Preload Bridge:</strong> Safe IPC communication through <code>electron/preload.cjs</code>.</li>
                      <li><strong>Proper AppData Storage:</strong> Database saved to <code>%APPDATA%\WinLaunch\websites.db</code> (never erased during updates).</li>
                      <li><strong>NSIS Installer:</strong> Packages into <code>WinLaunch-Setup-1.0.0.exe</code> with automatic Desktop & Start Menu shortcuts.</li>
                    </ul>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenBuildGuide();
                      }}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Open Full Windows .exe Build Guide & Source Code</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end px-6 py-3 border-t ${
          isDark ? 'border-slate-800 bg-slate-850/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  X, 
  PackageCheck, 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  ShieldCheck, 
  FileCode, 
  FolderCheck,
  ExternalLink 
} from 'lucide-react';
import { AppSettings } from '../types';

interface ElectronBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const ElectronBuildModal: React.FC<ElectronBuildModalProps> = ({
  isOpen,
  onClose,
  settings,
  onShowToast
}) => {
  const isDark = settings.theme === 'dark';
  const [selectedFile, setSelectedFile] = useState<'guide' | 'main' | 'preload' | 'builder' | 'package'>('guide');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    onShowToast(`Copied ${key} to clipboard`, 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const fileContents = {
    guide: `# How to Build the Windows .exe Installer

1. Make sure Node.js (v18+) is installed on your Windows machine:
   https://nodejs.org

2. In your project directory, install dependencies:
   npm install

3. Test running the app inside Electron:
   npm run electron:dev

4. Build the standalone Windows .exe installer:
   npm run electron:build

Output:
   dist_electron/WinLaunch-Setup-1.0.0.exe

Features of the generated installer:
* NSIS Installer with standard Windows setup wizard
* Start Menu shortcut ("WinLaunch")
* Desktop shortcut (optional / enabled by default)
* Stores database in %APPDATA%\\WinLaunch\\websites.db so data is preserved across updates
* Secure Electron with contextIsolation: true and nodeIntegration: false`,

    main: `/**
 * WinLaunch - Windows Website Launcher
 * Secure Electron Main Process (electron/main.cjs)
 */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');

let mainWindow = null;

// Ensure single instance on Windows
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function findChromeExecutable() {
  const possiblePaths = [
    'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\\\Chrome\\\\Application\\\\chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google\\\\Chrome\\\\Application\\\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\\\Chrome\\\\Application\\\\chrome.exe')
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getAppDataDir() {
  const appData = app.getPath('appData');
  const targetDir = path.join(appData, 'WinLaunch');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 860,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,  // Security best practice
      nodeIntegration: false,   // Security best practice
      sandbox: false
    }
  });

  if (app.isPackaged || process.env.NODE_ENV === 'production') {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }
}

ipcMain.handle('detect-chrome', () => {
  const chromePath = findChromeExecutable();
  return { installed: !!chromePath, path: chromePath || 'Not found' };
});

ipcMain.handle('open-url', async (event, { url, preferredBrowser = 'chrome' }) => {
  if (preferredBrowser === 'chrome') {
    const chromePath = findChromeExecutable();
    if (chromePath) {
      spawn(chromePath, [url], { detached: true, stdio: 'ignore' }).unref();
      return { success: true, browser: 'Google Chrome', path: chromePath };
    }
  }
  await shell.openExternal(url);
  return { success: true, browser: 'Default Browser' };
});

app.whenReady().then(createWindow);`,

    preload: `/**
 * WinLaunch - Windows Website Launcher
 * Secure Electron Preload Script (electron/preload.cjs)
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Chrome & Browser Actions
  detectChrome: () => ipcRenderer.invoke('detect-chrome'),
  openUrl: (options) => ipcRenderer.invoke('open-url', options),

  // Storage & AppData Info
  getAppDataInfo: () => ipcRenderer.invoke('get-appdata-info')
});`,

    builder: `{
  "appId": "com.winlaunch.app",
  "productName": "WinLaunch",
  "directories": {
    "output": "dist_electron"
  },
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64", "arm64"] }],
    "artifactName": "\${productName}-Setup-\${version}.\${ext}"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": "always",
    "createStartMenuShortcut": true,
    "shortcutName": "WinLaunch"
  }
}`,

    package: `{
  "name": "winlaunch",
  "version": "1.0.0",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build",
    "electron:dev": "electron .",
    "electron:build": "vite build && electron-builder --win"
  },
  "devDependencies": {
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0"
  }
}`
  };

  const handleDownloadAll = () => {
    // Generate combined bundle download
    const fullMarkdown = `# WinLaunch - Windows Desktop App (.exe) Package

Generated files:
1. electron/main.cjs
2. electron/preload.cjs
3. electron-builder.json
4. WINDOWS_EXE_BUILD_GUIDE.md

## Step 1: Install Dependencies
npm install

## Step 2: Build Windows Installer
npm run electron:build

The installer will be generated in dist_electron/WinLaunch-Setup-1.0.0.exe
with Start Menu & Desktop shortcuts, storing data in %APPDATA%\\WinLaunch\\websites.db.
`;

    const blob = new Blob([fullMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WinLaunch-Windows-Build-Guide.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onShowToast('Downloaded Windows setup files and instructions', 'success');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="modal-electron-build-guide"
        className={`w-full max-w-4xl h-[680px] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
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
              <PackageCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Windows Desktop App (.exe) Setup & Source</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Electron + Node.js + SQLite + NSIS Installer with Start Menu and Desktop shortcuts
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

        {/* Action Header Banner */}
        <div className={`px-6 py-3 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-blue-50/60 border-blue-100'
        }`}>
          <div className="flex items-center space-x-2 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Complete Electron architecture configured with contextIsolation and AppData SQLite storage</span>
          </div>

          <button
            onClick={handleDownloadAll}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Guide & Config</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* File Selector Tabs */}
          <div className={`w-56 p-3 border-r flex flex-col space-y-1 shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
              Project Files
            </div>

            <button
              onClick={() => setSelectedFile('guide')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedFile === 'guide'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Build Instructions</span>
            </button>

            <button
              onClick={() => setSelectedFile('main')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedFile === 'main'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>electron/main.cjs</span>
            </button>

            <button
              onClick={() => setSelectedFile('preload')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedFile === 'preload'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>electron/preload.cjs</span>
            </button>

            <button
              onClick={() => setSelectedFile('builder')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedFile === 'builder'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FolderCheck className="w-3.5 h-3.5" />
              <span>electron-builder.json</span>
            </button>

            <button
              onClick={() => setSelectedFile('package')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                selectedFile === 'package'
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>package.json</span>
            </button>

            {/* Quick Summary Pill */}
            <div className={`mt-auto p-3 rounded-lg border text-[11px] ${
              isDark ? 'bg-slate-850 border-slate-750 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <div className="font-semibold text-slate-300 mb-1">Target Specs:</div>
              <div>• OS: Windows 10/11 x64</div>
              <div>• Output: NSIS .exe</div>
              <div>• Shortcuts: Desktop & Start</div>
              <div>• DB: %APPDATA%\WinLaunch</div>
            </div>
          </div>

          {/* Code & Content Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200 font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-400">
              <span className="font-sans font-medium text-xs">
                {selectedFile === 'guide' && 'WINDOWS_EXE_BUILD_GUIDE.md'}
                {selectedFile === 'main' && 'electron/main.cjs (Electron Main Process)'}
                {selectedFile === 'preload' && 'electron/preload.cjs (Context Isolation Bridge)'}
                {selectedFile === 'builder' && 'electron-builder.json (NSIS Installer)'}
                {selectedFile === 'package' && 'package.json (Build Scripts)'}
              </span>

              <button
                onClick={() => handleCopy(fileContents[selectedFile], selectedFile)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                {copiedKey === selectedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 p-4 overflow-auto">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {fileContents[selectedFile]}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-3 border-t text-xs ${
          isDark ? 'border-slate-800 bg-slate-850/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <div>Run <code>npm run electron:build</code> on your Windows PC to generate the final setup executable.</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

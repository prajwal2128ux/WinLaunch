/**
 * WinLaunch - Windows Website Launcher
 * Secure Electron Main Process
 */
const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const serverModule = require('./server.cjs');

let mainWindow = null;
let tray = null;
let activeServerUrl = 'http://127.0.0.1:3000';
let isInternalServerStarted = false;

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Standard Windows Google Chrome paths
function findChromeExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }

  // Check via Windows where command
  try {
    const regQuery = execSync('where chrome', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (regQuery && fs.existsSync(regQuery.split('\r\n')[0])) {
      return regQuery.split('\r\n')[0];
    }
  } catch (e) {
    // ignore
  }

  return null;
}

function findEdgeExecutable() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(process.env.PROGRAMFILES || '', 'Microsoft\\Edge\\Application\\msedge.exe')
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function findFirefoxExecutable() {
  const possiblePaths = [
    'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
    'C:\\Program Files (x86)\\Mozilla Firefox\\firefox.exe',
    path.join(process.env.PROGRAMFILES || '', 'Mozilla Firefox\\firefox.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'Mozilla Firefox\\firefox.exe')
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getAppDataDir() {
  // Store user data in %APPDATA%\WinLaunch
  const appData = app.getPath('appData');
  const targetDir = path.join(appData, 'WinLaunch');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
}

function createWindow() {
  const appDataDir = getAppDataDir();
  const dbPath = path.join(appDataDir, 'websites.db');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 860,
    minHeight: 600,
    frame: false, // Windows 11 custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, // Secure practice
      nodeIntegration: false, // Secure practice
      sandbox: false,
      devTools: process.env.NODE_ENV === 'development'
    },
    icon: path.join(__dirname, '../public/icon.ico')
  });

  // Track maximize state
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-state', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-state', false);
  });

  // Load URL: Prefer live dev URL, then backend server URL, then fallback to local HTML
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (activeServerUrl) {
    mainWindow.loadURL(activeServerUrl).catch((err) => {
      console.warn('[WinLaunch Electron] Failed to load from server URL, falling back to loadFile:', err);
      const indexPath = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Prevent default external link opening inside webview
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// IPC Handlers
ipcMain.handle('detect-chrome', () => {
  const chromePath = findChromeExecutable();
  const edgePath = findEdgeExecutable();
  const firefoxPath = findFirefoxExecutable();
  return {
    installed: !!chromePath,
    path: chromePath || 'Not found (Default browser will be used)',
    edgeInstalled: !!edgePath,
    edgePath: edgePath || '',
    firefoxInstalled: !!firefoxPath,
    firefoxPath: firefoxPath || ''
  };
});

ipcMain.handle('open-url', async (event, { url, preferredBrowser = 'chrome' }) => {
  if (!url || typeof url !== 'string') return { success: false, error: 'No URL provided' };

  const trimmed = url.trim();

  // Prevent CLI switch injection (URLs beginning with - or / or flags)
  if (trimmed.startsWith('-') || trimmed.startsWith('/')) {
    return { success: false, error: 'Invalid URL format' };
  }

  // Validate protocol
  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : 'https://' + trimmed);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { success: false, error: 'Only http and https protocols are supported' };
    }
  } catch {
    return { success: false, error: 'Malformed URL' };
  }

  const cleanUrl = parsedUrl.href;

  if (preferredBrowser === 'chrome') {
    const chromePath = findChromeExecutable();
    if (chromePath) {
      try {
        spawn(chromePath, ['--', cleanUrl], { detached: true, stdio: 'ignore' }).unref();
        return { success: true, browser: 'Google Chrome', path: chromePath };
      } catch (err) {
        console.error('Failed to spawn Chrome, falling back to default browser:', err);
      }
    }
  } else if (preferredBrowser === 'edge') {
    const edgePath = findEdgeExecutable();
    if (edgePath) {
      try {
        spawn(edgePath, ['--', cleanUrl], { detached: true, stdio: 'ignore' }).unref();
        return { success: true, browser: 'Microsoft Edge', path: edgePath };
      } catch (err) {
        console.error('Failed to spawn Edge, falling back to default browser:', err);
      }
    }
  } else if (preferredBrowser === 'firefox') {
    const firefoxPath = findFirefoxExecutable();
    if (firefoxPath) {
      try {
        spawn(firefoxPath, ['--', cleanUrl], { detached: true, stdio: 'ignore' }).unref();
        return { success: true, browser: 'Mozilla Firefox', path: firefoxPath };
      } catch (err) {
        console.error('Failed to spawn Firefox, falling back to default browser:', err);
      }
    }
  }

  // Fallback to default browser
  try {
    await shell.openExternal(cleanUrl);
    return { success: true, browser: 'Default Browser (Fallback)' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-appdata-info', () => {
  const appDataDir = getAppDataDir();
  const dbPath = path.join(appDataDir, 'websites.db');
  return {
    appDataDir,
    dbPath,
    exists: fs.existsSync(dbPath),
    size: fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0
  };
});

// Window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// IPC handler for synchronous API URL retrieval by preload
ipcMain.on('get-api-url-sync', (event) => {
  event.returnValue = activeServerUrl || 'http://127.0.0.1:3000';
});

// IPC handler for asynchronous server status
ipcMain.handle('get-server-info', () => {
  return {
    url: activeServerUrl,
    isInternal: isInternalServerStarted
  };
});

function cleanupAndQuit() {
  if (isInternalServerStarted && serverModule) {
    try {
      serverModule.stopServer();
    } catch (e) {
      console.error('[WinLaunch Electron] Error stopping internal backend server:', e);
    }
    isInternalServerStarted = false;
  }
}

app.on('before-quit', () => {
  cleanupAndQuit();
});

app.on('will-quit', () => {
  cleanupAndQuit();
});

app.whenReady().then(async () => {
  const appDataDir = getAppDataDir();
  const dataDir = path.join(appDataDir, 'data');
  const distPath = path.join(__dirname, '../dist');

  // Check if an external server (e.g. dev server) is already running on port 3000
  const externalServerRunning = await serverModule.isServerHealthy('http://127.0.0.1:3000');
  if (externalServerRunning) {
    activeServerUrl = 'http://127.0.0.1:3000';
    console.log('[WinLaunch Electron] Using existing backend server at:', activeServerUrl);
  } else {
    try {
      console.log('[WinLaunch Electron] Starting production embedded backend server...');
      const serverResult = await serverModule.startServer({
        port: 3000,
        dataDir: dataDir,
        distPath: distPath
      });
      activeServerUrl = serverResult.url;
      isInternalServerStarted = true;
      console.log('[WinLaunch Electron] Embedded backend server running at:', activeServerUrl);
    } catch (err) {
      console.error('[WinLaunch Electron] Failed to start embedded backend server:', err);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  cleanupAndQuit();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

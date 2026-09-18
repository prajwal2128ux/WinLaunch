/**
 * WinLaunch - Windows Website Launcher
 * Secure Electron Preload Script
 */
const { contextBridge, ipcRenderer } = require('electron');

// Obtain active API URL from main process
let apiUrl = 'http://127.0.0.1:3000';
try {
  const resolved = ipcRenderer.sendSync('get-api-url-sync');
  if (resolved && typeof resolved === 'string') {
    apiUrl = resolved;
  }
} catch (e) {
  // fallback default
}

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  apiUrl: apiUrl,

  // Server Info
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  onMaximizeChange: (callback) => {
    const listener = (_event, isMaximized) => callback(isMaximized);
    ipcRenderer.on('window-maximized-state', listener);
    return () => ipcRenderer.removeListener('window-maximized-state', listener);
  },

  // Chrome & Browser Actions
  detectChrome: () => ipcRenderer.invoke('detect-chrome'),
  openUrl: (options) => ipcRenderer.invoke('open-url', options),

  // Storage & AppData Info
  getAppDataInfo: () => ipcRenderer.invoke('get-appdata-info')
});

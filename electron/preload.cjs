/**
 * WinLaunch - Windows Website Launcher
 * Secure Electron Preload Script
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

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

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tiklinuxDesktop', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getName: () => ipcRenderer.invoke('get-app-name'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  checkInternet: () => ipcRenderer.invoke('check-internet'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  onInternetStatus: (callback) => ipcRenderer.on('internet-status', (_, online) => callback(online)),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  onCheckForUpdates: (callback) => ipcRenderer.on('check-for-updates', () => callback()),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_, progress) => callback(progress)),
});

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
});

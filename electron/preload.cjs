const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('osuRadarDesktop', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('osu-radar:window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('osu-radar:window-toggle-maximize'),
  close: () => ipcRenderer.invoke('osu-radar:window-close'),
  isMaximized: () => ipcRenderer.invoke('osu-radar:window-is-maximized'),
  onMaximizedChange: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const listener = (_event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on('osu-radar:maximized-changed', listener);
    return () => {
      ipcRenderer.removeListener('osu-radar:maximized-changed', listener);
    };
  },
  selectDirectory: (options) => ipcRenderer.invoke('osu-radar:select-directory', options || {}),
  openExternal: (url) => ipcRenderer.invoke('osu-radar:open-external', url),
  log: (level, tag, message, extra) =>
    ipcRenderer.invoke('osu-radar:log', { level, tag, message, extra }),
});

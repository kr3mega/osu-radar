const { contextBridge, ipcRenderer } = require('electron');

const bridge = {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('osu-skills:window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('osu-skills:window-toggle-maximize'),
  close: () => ipcRenderer.invoke('osu-skills:window-close'),
  isMaximized: () => ipcRenderer.invoke('osu-skills:window-is-maximized'),
  onMaximizedChange: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }
    const listener = (_event, maximized) => callback(Boolean(maximized));
    ipcRenderer.on('osu-skills:maximized-changed', listener);
    ipcRenderer.on('osu-radar:maximized-changed', listener);
    return () => {
      ipcRenderer.removeListener('osu-skills:maximized-changed', listener);
      ipcRenderer.removeListener('osu-radar:maximized-changed', listener);
    };
  },
  selectDirectory: (options) => ipcRenderer.invoke('osu-skills:select-directory', options || {}),
  openExternal: (url) => ipcRenderer.invoke('osu-skills:open-external', url),
  log: (level, tag, message, extra) =>
    ipcRenderer.invoke('osu-skills:log', { level, tag, message, extra }),
  getGPUStatus: () => ipcRenderer.invoke('osu-skills:get-gpu-status'),
};

contextBridge.exposeInMainWorld('osuSkillsDesktop', bridge);
contextBridge.exposeInMainWorld('osuRadarDesktop', bridge);

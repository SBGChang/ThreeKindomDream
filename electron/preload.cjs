const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gameDesktop', {
  setFullscreen: enabled => ipcRenderer.invoke('game:set-fullscreen', Boolean(enabled)),
  isFullscreen: () => ipcRenderer.invoke('game:is-fullscreen'),
  quit: () => ipcRenderer.invoke('game:quit'),
});

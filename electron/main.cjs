const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
app.setName('ThreeKingdomDream');
function createWindow() {
  const win = new BrowserWindow({ width:1280, height:800, useContentSize:true, minWidth:960, minHeight:600, title:'三國夢 · 魏國篇', backgroundColor:'#100e0b', autoHideMenuBar:true, webPreferences:{ contextIsolation:true, nodeIntegration:false, sandbox:true, preload:path.join(__dirname,'preload.cjs') } });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  win.webContents.on('before-input-event', (_event,input) => { if(input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen()); });
  win.loadFile(path.join(__dirname,'..','dist','index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
ipcMain.handle('game:set-fullscreen', (event, enabled) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid game window');
  win.setFullScreen(Boolean(enabled));
  return win.isFullScreen();
});
ipcMain.handle('game:is-fullscreen', event => BrowserWindow.fromWebContents(event.sender)?.isFullScreen() ?? false);
ipcMain.handle('game:quit', event => {
  if (!BrowserWindow.fromWebContents(event.sender) || event.senderFrame !== event.sender.mainFrame) throw new Error('Invalid game window');
  app.quit();
});

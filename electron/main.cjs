const { app, BrowserWindow } = require('electron');
const path = require('node:path');
app.setName('ThreeKingdomDream');
function createWindow() {
  const win = new BrowserWindow({ width:1280, height:800, useContentSize:true, minWidth:960, minHeight:600, title:'三國夢 · 魏國篇', backgroundColor:'#100e0b', autoHideMenuBar:true, webPreferences:{ contextIsolation:true, nodeIntegration:false, sandbox:true } });
  win.removeMenu();
  win.webContents.setWindowOpenHandler(() => ({ action:'deny' }));
  win.webContents.on('before-input-event', (_event,input) => { if(input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen()); });
  win.loadFile(path.join(__dirname,'..','dist','index.html'));
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); }); });
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const registerShortcuts = () => {
  globalShortcut.register('F11', () => {
    const isFullScreen = mainWindow.isFullScreen();
    mainWindow.setFullScreen(!isFullScreen);
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow.isFullScreen()) {
      mainWindow.setFullScreen(false);
    }
  });
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
  registerShortcuts();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
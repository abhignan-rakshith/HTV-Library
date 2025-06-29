const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const registerShortcuts = () => {
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    }
  });

  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFullScreen()) {
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
      webSecurity: false, // Required for external content
      allowRunningInsecureContent: true, // Required for some media sites
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Handle webview attachment with minimal logging
  mainWindow.webContents.on('did-attach-webview', (event, webContents) => {
    // Set window open handler to prevent popups
    webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });
  });

  await mainWindow.loadFile(path.join(__dirname, 'index.html'));
  registerShortcuts();
};

app.on('ready', () => {
  // Set app user model ID for Windows taskbar grouping
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.htv.library');
  }
  
  createWindow();
});

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

// Handle second instance for single instance enforcement
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
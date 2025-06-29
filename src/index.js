const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

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

const setupIpcHandlers = () => {
  // Handle file dialog for database path selection
  ipcMain.handle('select-database-path', async () => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Select Database Location',
        defaultPath: path.join(app.getPath('documents'), 'htv-library.db'),
        filters: [
          { name: 'SQLite Database', extensions: ['db'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['createDirectory']
      });

      if (result.canceled) {
        return { success: false, path: null };
      }

      return { success: true, path: result.filePath };
    } catch (error) {
      console.error('Error selecting database path:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle database file creation
  ipcMain.handle('create-database', async (event, dbPath) => {
    try {
      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create empty database file if it doesn't exist
      if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '');
      }

      // Verify file was created and is accessible
      const stats = fs.statSync(dbPath);
      
      return { 
        success: true, 
        path: dbPath,
        size: stats.size,
        created: stats.birthtime
      };
    } catch (error) {
      console.error('Error creating database:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle database existence check
  ipcMain.handle('check-database', async (event, dbPath) => {
    try {
      if (!dbPath) {
        return { exists: false };
      }

      const exists = fs.existsSync(dbPath);
      if (exists) {
        const stats = fs.statSync(dbPath);
        return { 
          exists: true, 
          path: dbPath,
          size: stats.size,
          modified: stats.mtime
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking database:', error);
      return { exists: false, error: error.message };
    }
  });

  // Handle app info requests
  ipcMain.handle('get-app-info', () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      appPath: app.getAppPath(),
      userDataPath: app.getPath('userData')
    };
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

  // Setup IPC handlers before loading the page
  setupIpcHandlers();

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
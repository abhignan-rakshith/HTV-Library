const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
const { ElectronBlocker } = require('@cliqz/adblocker-electron');
const fetch = require('cross-fetch');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let blocker;

// Initialize the ad blocker
const initializeAdBlocker = async () => {
  console.log('Initializing ad blocker...');
  blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
  
  // Enable blocking in default session
  blocker.enableBlockingInSession(session.defaultSession);
  
  // Enable blocking in persist:main partition used by webview
  const persistSession = session.fromPartition('persist:main');
  blocker.enableBlockingInSession(persistSession);
  
  console.log('Ad blocker initialized and enabled for all sessions');
};

const createWindow = async () => {
  // First initialize the ad blocker
  await initializeAdBlocker();

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the index.html of the app.
  await mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Enter fullscreen mode
  mainWindow.setFullScreen(true);

  // Debug: Log blocked requests
  blocker.on('request-blocked', (request) => {
    console.log('Blocked:', request.url);
  });

  blocker.on('request-redirected', (request) => {
    console.log('Redirected:', request.url);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

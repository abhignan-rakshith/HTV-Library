const { contextBridge, ipcRenderer } = require('electron');

// Secure IPC channel whitelist
const ALLOWED_CHANNELS = [
  'app-version', 
  'window-controls',
  'select-database-path',
  'create-database',
  'check-database',
  'get-app-info'
];

// Expose secure APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Secure IPC communication
  send: (channel, data) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  receive: (channel, func) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },

  // App information
  getVersion: () => {
    return process.versions.electron;
  },

  // Platform information
  getPlatform: () => {
    return process.platform;
  },

  // Settings-related API methods
  settings: {
    // Open file dialog for database path selection
    selectDatabasePath: () => {
      return ipcRenderer.invoke('select-database-path');
    },

    // Create database file at specified path
    createDatabase: (dbPath) => {
      return ipcRenderer.invoke('create-database', dbPath);
    },

    // Check if database exists at path
    checkDatabase: (dbPath) => {
      return ipcRenderer.invoke('check-database', dbPath);
    },

    // Get application information
    getAppInfo: () => {
      return ipcRenderer.invoke('get-app-info');
    }
  },

  // Database operations API
  database: {
    // Initialize database connection
    initialize: (dbPath) => {
      return ipcRenderer.invoke('db-initialize', dbPath);
    },

    // Close database connection
    close: () => {
      return ipcRenderer.invoke('db-close');
    },

    // Video operations
    checkVideoDuplicate: (url) => {
      return ipcRenderer.invoke('db-check-video-duplicate', url);
    },

    saveVideo: (videoData, isUpdate = false) => {
      return ipcRenderer.invoke('db-save-video', videoData, isUpdate);
    },

    // Image operations
    checkImageDuplicates: (imageUrls, sourceUrl) => {
      return ipcRenderer.invoke('db-check-image-duplicates', imageUrls, sourceUrl);
    },

    saveImages: (imageData) => {
      return ipcRenderer.invoke('db-save-images', imageData);
    },

    // Data retrieval
    getPlaylists: () => {
      return ipcRenderer.invoke('db-get-playlists');
    },

    getStats: () => {
      return ipcRenderer.invoke('db-get-stats');
    }
  }
});

// Prevent node integration leakage
delete window.require;
delete window.exports;
delete window.module;
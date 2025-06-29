const { contextBridge, ipcRenderer } = require('electron');

// Secure IPC channel whitelist
const ALLOWED_CHANNELS = ['app-version', 'window-controls'];

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
  }
});

// Prevent node integration leakage
delete window.require;
delete window.exports;
delete window.module;
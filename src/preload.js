const { contextBridge, ipcRenderer } = require('electron');

// Whitelist of allowed IPC channels for security
const ALLOWED_CHANNELS = ['mouse-top-edge'];

// Expose secure IPC methods to renderer process
contextBridge.exposeInMainWorld('electron', {
  send: (channel, data) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },

  receive: (channel, func) => {
    if (ALLOWED_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
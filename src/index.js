const { app, BrowserWindow, globalShortcut, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

// Global database instance
let db = null;

// Helper function to clean URLs for consistent storage
const cleanUrl = (url) => {
  if (!url) return '';
  return url.split('?')[0].split('#')[0].toLowerCase();
};

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

  // Database operations
  ipcMain.handle('db-initialize', async (event, dbPath) => {
    try {
      if (db) {
        db.close();
      }

      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Initialize database connection
      db = new Database(dbPath);
      
      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');
      
      // Create tables
      createTables();
      
      console.log('Database initialized at:', dbPath);
      return { success: true, path: dbPath };
    } catch (error) {
      console.error('Database initialization failed:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db-close', async () => {
    try {
      if (db) {
        db.close();
        db = null;
      }
      return { success: true };
    } catch (error) {
      console.error('Error closing database:', error);
      return { success: false, error: error.message };
    }
  });

  // Video operations
  ipcMain.handle('db-check-video-duplicate', async (event, url) => {
    try {
      if (!db) {
        return { error: 'Database not initialized' };
      }

      const cleanUrlValue = cleanUrl(url);
      const stmt = db.prepare('SELECT * FROM videos WHERE url = ?');
      const result = stmt.get(cleanUrlValue);
      
      return { duplicate: result || null };
    } catch (error) {
      console.error('Error checking video duplicate:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('db-save-video', async (event, videoData, isUpdate = false) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const cleanUrlValue = cleanUrl(videoData.url);
      const tagsJson = JSON.stringify(videoData.tags || []);

      if (isUpdate) {
        const stmt = db.prepare(`
          UPDATE videos SET
            title = ?, views = ?, thumbnail = ?, brand = ?, 
            playlist = ?, release_date = ?, plot = ?, tags = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE url = ?
        `);
        
        const result = stmt.run(
          videoData.title, videoData.views, videoData.thumbnail, 
          videoData.brand, videoData.playlist, videoData.releaseDate, 
          videoData.plot, tagsJson, cleanUrlValue
        );
        
        return { success: true, action: 'updated', changes: result.changes };
      } else {
        // Try insert first, if it fails due to unique constraint, do an update instead
        try {
          const stmt = db.prepare(`
            INSERT INTO videos (url, title, views, thumbnail, brand, playlist, release_date, plot, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const result = stmt.run(
            cleanUrlValue, videoData.title, videoData.views, 
            videoData.thumbnail, videoData.brand, 
            videoData.playlist, videoData.releaseDate, 
            videoData.plot, tagsJson
          );
          
          return { success: true, action: 'inserted', id: result.lastInsertRowid };
        } catch (insertError) {
          if (insertError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            // URL already exists, update instead
            const updateStmt = db.prepare(`
              UPDATE videos SET
                title = ?, views = ?, thumbnail = ?, brand = ?, 
                playlist = ?, release_date = ?, plot = ?, tags = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE url = ?
            `);
            
            const result = updateStmt.run(
              videoData.title, videoData.views, videoData.thumbnail, 
              videoData.brand, videoData.playlist, videoData.releaseDate, 
              videoData.plot, tagsJson, cleanUrlValue
            );
            
            return { success: true, action: 'updated', changes: result.changes };
          } else {
            throw insertError; // Re-throw if it's a different error
          }
        }
      }
    } catch (error) {
      console.error('Error saving video:', error);
      return { success: false, error: error.message };
    }
  });

  // Image operations
  ipcMain.handle('db-check-image-duplicates', async (event, imageUrls, sourceUrl) => {
    try {
      if (!db) {
        return { error: 'Database not initialized' };
      }

      const cleanSourceUrlValue = cleanUrl(sourceUrl);
      const duplicates = [];

      const stmt = db.prepare('SELECT * FROM images WHERE url = ? AND source_url = ?');
      
      for (const imageUrl of imageUrls) {
        const result = stmt.get(imageUrl, cleanSourceUrlValue);
        if (result) {
          duplicates.push(result);
        }
      }

      return { duplicates };
    } catch (error) {
      console.error('Error checking image duplicates:', error);
      return { error: error.message };
    }
  });

  ipcMain.handle('db-save-images', async (event, imageData) => {
    try {
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const cleanSourceUrlValue = cleanUrl(imageData.sourceUrl);
      let savedCount = 0;
      let skippedCount = 0;

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO images (url, tag, comments, source_url, saved_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const imageUrl of imageData.urls) {
        try {
          const result = stmt.run(
            imageUrl, 
            imageData.tag, 
            imageData.comments, 
            cleanSourceUrlValue, 
            imageData.savedAt
          );
          
          if (result.changes > 0) {
            savedCount++;
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error('Error saving image:', error);
          skippedCount++;
        }
      }

      return { success: true, saved: savedCount, skipped: skippedCount };
    } catch (error) {
      console.error('Error saving images:', error);
      return { success: false, error: error.message };
    }
  });

  // Playlist operations
  ipcMain.handle('db-get-playlists', async () => {
    try {
      if (!db) {
        return { playlists: [] };
      }

      const stmt = db.prepare('SELECT DISTINCT playlist FROM videos WHERE playlist IS NOT NULL AND playlist != \'\' ORDER BY playlist');
      const rows = stmt.all();
      
      return { playlists: rows.map(row => row.playlist) };
    } catch (error) {
      console.error('Error getting playlists:', error);
      return { playlists: [], error: error.message };
    }
  });

  // Statistics
  ipcMain.handle('db-get-stats', async () => {
    try {
      if (!db) {
        return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0 };
      }

      const videoCount = db.prepare('SELECT COUNT(*) as count FROM videos').get().count;
      const imageCount = db.prepare('SELECT COUNT(*) as count FROM images').get().count;
      const playlistCount = db.prepare('SELECT COUNT(DISTINCT playlist) as count FROM videos WHERE playlist IS NOT NULL AND playlist != \'\'').get().count;
      
      // Get database file size
      let dbSize = 0;
      try {
        const stats = fs.statSync(db.name);
        dbSize = stats.size;
      } catch (e) {
        console.warn('Could not get database size:', e);
      }

      return {
        totalVideos: videoCount,
        totalImages: imageCount,
        totalPlaylists: playlistCount,
        dbSize
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0, error: error.message };
    }
  });
};

// Helper function to create database tables
const createTables = () => {
  const videoTableSQL = `
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT,
      views INTEGER,
      thumbnail TEXT,
      brand TEXT,
      playlist TEXT,
      release_date TEXT,
      plot TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const imagesTableSQL = `
    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      tag TEXT NOT NULL,
      comments TEXT,
      source_url TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(url, source_url, tag)
    )
  `;

  db.exec(videoTableSQL);
  db.exec(imagesTableSQL);
  
  console.log('Database tables created/verified');
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
  
  // Setup IPC handlers before creating window
  setupIpcHandlers();
  
  createWindow();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  
  // Close database connection
  if (db) {
    try {
      db.close();
      db = null;
    } catch (error) {
      console.error('Error closing database on app exit:', error);
    }
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
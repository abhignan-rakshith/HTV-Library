/**
 * DatabaseManager - Handles SQLite database operations with duplicate detection
 * 
 * Note: The getPlaylists() method now properly checks:
 * 1. If database is initialized and configured
 * 2. If database file exists and is accessible  
 * 3. If there are actual playlist entries in the database
 * 
 * This ensures the playlist dropdown is only populated when there's real data,
 * not with hardcoded placeholder values.
 */
class DatabaseManager {
    constructor() {
      this.db = null;
      this.dbPath = null;
    }
  
    /**
     * Initialize database with schema
     * @param {string} dbPath - Path to database file
     * @returns {Promise<boolean>} - Success status
     */
    async initialize(dbPath) {
      try {
        this.dbPath = dbPath;
        
        console.log('Initializing database at:', dbPath);
        
        // Use IPC to initialize database in main process
        const result = await window.electronAPI.database.initialize(dbPath);
        
        if (result.success) {
          this.db = true; // Mark as initialized
          console.log('Database initialized successfully');
          return true;
        } else {
          console.error('Database initialization failed:', result.error);
          return false;
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
      }
    }
  
    /**
     * Create database tables - now handled by main process
     * @private
     */
    async createTables() {
      // Table creation is now handled in the main process during initialization
      console.log('Database tables handled by main process');
    }
  
    /**
     * Check for duplicate video by URL
     * @param {string} url - Video URL to check
     * @returns {Promise<Object|null>} - Existing video data or null
     */
    async checkVideoDuplicate(url) {
      try {
        if (!this.db || !this.dbPath) {
          console.log('Database not initialized');
          return null;
        }

        const result = await window.electronAPI.database.checkVideoDuplicate(url);
        
        if (result.error) {
          console.error('Error checking video duplicate:', result.error);
          return null;
        }

        if (result.duplicate) {
          // Parse tags back from JSON string
          if (result.duplicate.tags) {
            try {
              result.duplicate.tags = JSON.parse(result.duplicate.tags);
            } catch (e) {
              result.duplicate.tags = [];
            }
          }
        }

        return result.duplicate;
        
      } catch (error) {
        console.error('Error checking video duplicate:', error);
        return null;
      }
    }
  
    /**
     * Check for duplicate images by URL and source
     * @param {string[]} imageUrls - Array of image URLs
     * @param {string} sourceUrl - Source page URL
     * @returns {Promise<Object[]>} - Array of existing images
     */
    async checkImageDuplicates(imageUrls, sourceUrl) {
      try {
        if (!this.db || !this.dbPath) {
          console.log('Database not initialized');
          return [];
        }

        const result = await window.electronAPI.database.checkImageDuplicates(imageUrls, sourceUrl);
        
        if (result.error) {
          console.error('Error checking image duplicates:', result.error);
          return [];
        }

        return result.duplicates || [];
        
      } catch (error) {
        console.error('Error checking image duplicates:', error);
        return [];
      }
    }
  
    /**
     * Save video to database
     * @param {Object} videoData - Video data to save
     * @param {boolean} isUpdate - Whether this is an update operation
     * @returns {Promise<Object>} - Save result
     */
    async saveVideo(videoData, isUpdate = false) {
      try {
        if (!this.db || !this.dbPath) {
          return { success: false, error: 'Database not initialized' };
        }

        const result = await window.electronAPI.database.saveVideo(videoData, isUpdate);
        
        if (result.success) {
          console.log(`Video ${isUpdate ? 'updated' : 'saved'} in database:`, videoData.url);
        } else {
          console.error('Error saving video:', result.error);
        }

        return result;
        
      } catch (error) {
        console.error('Error saving video:', error);
        return { success: false, error: error.message };
      }
    }
  
    /**
     * Save images to database
     * @param {Object} imageData - Image data to save
     * @returns {Promise<Object>} - Save result
     */
    async saveImages(imageData) {
      try {
        if (!this.db || !this.dbPath) {
          return { success: false, error: 'Database not initialized' };
        }

        const result = await window.electronAPI.database.saveImages(imageData);
        
        if (result.success) {
          console.log(`Images saved: ${result.saved}, skipped: ${result.skipped}`);
        } else {
          console.error('Error saving images:', result.error);
        }

        return result;
        
      } catch (error) {
        console.error('Error saving images:', error);
        return { success: false, error: error.message };
      }
    }
  
    /**
     * Get all unique playlists from database
     * @returns {Promise<string[]>} - Array of playlist names
     */
    async getPlaylists() {
      try {
        // Check if database is initialized and path is set
        if (!this.db || !this.dbPath) {
          console.log('DatabaseManager: Database not initialized, returning empty playlists');
          return [];
        }

        const result = await window.electronAPI.database.getPlaylists();
        
        if (result.error) {
          console.error('DatabaseManager: Error getting playlists:', result.error);
          return [];
        }

        const playlists = result.playlists || [];
        
        if (playlists.length === 0) {
          console.log('DatabaseManager: No playlists found in database');
        } else {
          console.log('DatabaseManager: Found', playlists.length, 'playlists:', playlists);
        }

        return playlists;
        
      } catch (error) {
        console.error('DatabaseManager: Error getting playlists:', error);
        return [];
      }
    }
  
    /**
     * Get database statistics
     * @returns {Promise<Object>} - Database stats
     */
    async getStats() {
      try {
        if (!this.db || !this.dbPath) {
          return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0 };
        }

        const result = await window.electronAPI.database.getStats();
        
        if (result.error) {
          console.error('Error getting database stats:', result.error);
          return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0 };
        }

        return {
          totalVideos: result.totalVideos || 0,
          totalImages: result.totalImages || 0,
          totalPlaylists: result.totalPlaylists || 0,
          dbSize: result.dbSize || 0
        };
      } catch (error) {
        console.error('Error getting stats:', error);
        return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0 };
      }
    }
  
    /**
     * Close database connection
     */
    async close() {
      try {
        if (this.db) {
          await window.electronAPI.database.close();
          this.db = null;
          this.dbPath = null;
          console.log('Database connection closed');
        }
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
  
  window.DatabaseManager = DatabaseManager;
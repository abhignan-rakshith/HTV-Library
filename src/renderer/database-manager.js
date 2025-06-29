/**
 * DatabaseManager - Handles SQLite database operations with duplicate detection
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
        
        // Note: In a real Electron app, you'd use sqlite3 or better-sqlite3
        // For this example, I'll show the structure you'd need
        console.log('Initializing database at:', dbPath);
        
        await this.createTables();
        return true;
      } catch (error) {
        console.error('Database initialization failed:', error);
        return false;
      }
    }
  
    /**
     * Create database tables
     * @private
     */
    async createTables() {
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
          tags TEXT, -- JSON array as string
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
  
      // Execute table creation
      // In real implementation:
      // await this.db.exec(videoTableSQL);
      // await this.db.exec(imagesTableSQL);
      
      console.log('Database tables created/verified');
    }
  
    /**
     * Check for duplicate video by URL
     * @param {string} url - Video URL to check
     * @returns {Promise<Object|null>} - Existing video data or null
     */
    async checkVideoDuplicate(url) {
      try {
        const cleanUrl = this.cleanUrl(url);
        
        // In real implementation:
        // const stmt = await this.db.prepare('SELECT * FROM videos WHERE url = ?');
        // const result = await stmt.get(cleanUrl);
        
        // For demo purposes, simulate finding a duplicate
        const simulatedExisting = {
          id: 1,
          url: cleanUrl,
          title: "Existing Video Title",
          views: 1234,
          thumbnail: "https://example.com/thumb.jpg",
          brand: "Existing Brand",
          playlist: "Favorites",
          release_date: "2024-01-15",
          plot: "This is an existing video in the database...",
          tags: JSON.stringify(["tag1", "tag2"]),
          created_at: "2024-01-15 10:30:00",
          updated_at: "2024-01-15 10:30:00"
        };
  
        // Return null for no duplicate, or the existing record
        return Math.random() > 0.7 ? simulatedExisting : null;
        
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
        const cleanSourceUrl = this.cleanUrl(sourceUrl);
        const duplicates = [];
  
        for (const imageUrl of imageUrls) {
          // In real implementation:
          // const stmt = await this.db.prepare('SELECT * FROM images WHERE url = ? AND source_url = ?');
          // const result = await stmt.get(imageUrl, cleanSourceUrl);
          
          // Simulate finding some duplicates
          if (Math.random() > 0.8) {
            duplicates.push({
              id: Math.floor(Math.random() * 1000),
              url: imageUrl,
              tag: "Existing Tag",
              comments: "Previously saved image",
              source_url: cleanSourceUrl,
              saved_at: "2024-01-10 15:20:00",
              created_at: "2024-01-10 15:20:00"
            });
          }
        }
  
        return duplicates;
        
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
        const cleanUrl = this.cleanUrl(videoData.url);
        const tagsJson = JSON.stringify(videoData.tags || []);
  
        if (isUpdate) {
          // Update existing record
          const updateSQL = `
            UPDATE videos SET
              title = ?, views = ?, thumbnail = ?, brand = ?, 
              playlist = ?, release_date = ?, plot = ?, tags = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE url = ?
          `;
          
          // In real implementation:
          // const stmt = await this.db.prepare(updateSQL);
          // await stmt.run(videoData.title, videoData.views, videoData.thumbnail, 
          //                videoData.brand, videoData.playlist, videoData.releaseDate, 
          //                videoData.plot, tagsJson, cleanUrl);
          
          console.log('Video updated in database:', cleanUrl);
          return { success: true, action: 'updated', id: 1 };
          
        } else {
          // Insert new record
          const insertSQL = `
            INSERT INTO videos (url, title, views, thumbnail, brand, playlist, release_date, plot, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          // In real implementation:
          // const stmt = await this.db.prepare(insertSQL);
          // const result = await stmt.run(cleanUrl, videoData.title, videoData.views, 
          //                               videoData.thumbnail, videoData.brand, 
          //                               videoData.playlist, videoData.releaseDate, 
          //                               videoData.plot, tagsJson);
          
          console.log('Video saved to database:', cleanUrl);
          return { success: true, action: 'inserted', id: Math.floor(Math.random() * 1000) };
        }
        
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
        const cleanSourceUrl = this.cleanUrl(imageData.sourceUrl);
        let savedCount = 0;
        let skippedCount = 0;
  
        for (const imageUrl of imageData.urls) {
          try {
            const insertSQL = `
              INSERT OR IGNORE INTO images (url, tag, comments, source_url, saved_at)
              VALUES (?, ?, ?, ?, ?)
            `;
            
            // In real implementation:
            // const stmt = await this.db.prepare(insertSQL);
            // const result = await stmt.run(imageUrl, imageData.tag, imageData.comments, 
            //                               cleanSourceUrl, imageData.savedAt);
            
            // Simulate some images being skipped due to duplicates
            if (Math.random() > 0.2) {
              savedCount++;
            } else {
              skippedCount++;
            }
            
          } catch (error) {
            console.error(`Error saving image ${imageUrl}:`, error);
            skippedCount++;
          }
        }
  
        console.log(`Images saved: ${savedCount}, skipped: ${skippedCount}`);
        return { 
          success: true, 
          saved: savedCount, 
          skipped: skippedCount,
          total: imageData.urls.length
        };
        
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
        // In real implementation:
        // const stmt = await this.db.prepare('SELECT DISTINCT playlist FROM videos WHERE playlist IS NOT NULL AND playlist != "" ORDER BY playlist');
        // const rows = await stmt.all();
        // return rows.map(row => row.playlist);
        
        // Simulate some existing playlists
        return ['Favorites', 'Watch Later', 'Comedy', 'Drama', 'Action'];
        
      } catch (error) {
        console.error('Error getting playlists:', error);
        return [];
      }
    }
  
    /**
     * Get database statistics
     * @returns {Promise<Object>} - Database stats
     */
    async getStats() {
      try {
        // In real implementation, you'd run actual COUNT queries
        return {
          totalVideos: Math.floor(Math.random() * 1000),
          totalImages: Math.floor(Math.random() * 5000),
          totalPlaylists: 5,
          dbSize: Math.floor(Math.random() * 10000000) // bytes
        };
      } catch (error) {
        console.error('Error getting stats:', error);
        return { totalVideos: 0, totalImages: 0, totalPlaylists: 0, dbSize: 0 };
      }
    }
  
    /**
     * Clean URL for consistent storage
     * @param {string} url - URL to clean
     * @returns {string} - Cleaned URL
     * @private
     */
    cleanUrl(url) {
      if (!url) return '';
      // Remove query parameters and fragments for consistent comparison
      return url.split('?')[0].split('#')[0].toLowerCase();
    }
  
    /**
     * Close database connection
     */
    async close() {
      try {
        if (this.db) {
          // In real implementation:
          // await this.db.close();
          this.db = null;
        }
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
  
  window.DatabaseManager = DatabaseManager;
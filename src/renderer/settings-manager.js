/**
 * SettingsManager - Handles application settings and database configuration
 */
class SettingsManager {
    constructor(uiManager) {
      this.uiManager = uiManager;
      this.settings = {
        databasePath: null
      };
      
      this.elements = {
        dbPathInput: document.getElementById('dbPathInput'),
        selectDbPathBtn: document.getElementById('selectDbPathBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        testConnectionBtn: document.getElementById('testConnectionBtn'),
        dbStatus: document.getElementById('dbStatus'),
        appVersion: document.getElementById('appVersion'),
        appPlatform: document.getElementById('appPlatform'),
        electronVersion: document.getElementById('electronVersion')
      };
  
      this.init();
    }
  
    /**
     * Initialize settings manager
     */
    async init() {
      this.setupEventListeners();
      await this.loadSettings();
      await this.loadAppInfo();
      await this.updateDatabaseStatus();
    }
  
    /**
     * Setup event listeners for settings UI
     */
    setupEventListeners() {
      // Database path selection
      this.elements.selectDbPathBtn.addEventListener('click', () => {
        this.selectDatabasePath();
      });
  
      // Save settings
      this.elements.saveSettingsBtn.addEventListener('click', () => {
        this.saveSettings();
      });
  
      // Test database connection
      this.elements.testConnectionBtn.addEventListener('click', () => {
        this.testDatabaseConnection();
      });
  
      // Enable save button when path changes
      this.elements.dbPathInput.addEventListener('input', () => {
        this.updateSaveButtonState();
      });
    }
  
    /**
     * Open file dialog to select database path
     */
    async selectDatabasePath() {
      try {
        this.elements.selectDbPathBtn.disabled = true;
        this.elements.selectDbPathBtn.textContent = 'Selecting...';
  
        const result = await window.electronAPI.settings.selectDatabasePath();
        
        if (result.success && result.path) {
          this.elements.dbPathInput.value = result.path;
          this.updateSaveButtonState();
          this.uiManager.showSnackbar('Database path selected!');
        } else if (!result.success && result.error) {
          this.uiManager.showSnackbar(`Error: ${result.error}`);
        }
        
      } catch (error) {
        console.error('Error selecting database path:', error);
        this.uiManager.showSnackbar('Failed to open file dialog');
      } finally {
        this.elements.selectDbPathBtn.disabled = false;
        this.elements.selectDbPathBtn.textContent = 'Browse';
      }
    }
  
    /**
     * Save settings and create database file
     */
    async saveSettings() {
      const dbPath = this.elements.dbPathInput.value.trim();
      
      if (!dbPath) {
        this.uiManager.showSnackbar('Please select a database path first!');
        return;
      }
  
      try {
        this.elements.saveSettingsBtn.disabled = true;
        this.elements.saveSettingsBtn.textContent = 'Saving...';
        this.updateDatabaseStatus('loading', 'Creating database...');
  
        // Create database file
        const result = await window.electronAPI.settings.createDatabase(dbPath);
        
        if (result.success) {
          // Save to localStorage
          this.settings.databasePath = dbPath;
          this.saveSettingsToStorage();
          
          // Update UI
          await this.updateDatabaseStatus();
          this.uiManager.showSnackbar('Database created and configured successfully!');
          this.updateSaveButtonState();
          
        } else {
          this.updateDatabaseStatus('not-configured', `Error: ${result.error}`);
          this.uiManager.showSnackbar(`Failed to create database: ${result.error}`);
        }
        
      } catch (error) {
        console.error('Error saving settings:', error);
        this.updateDatabaseStatus('not-configured', 'Failed to create database');
        this.uiManager.showSnackbar('Error saving settings');
      } finally {
        this.elements.saveSettingsBtn.disabled = false;
        this.elements.saveSettingsBtn.textContent = 'Save Configuration';
      }
    }
  
    /**
     * Test database connection
     */
    async testDatabaseConnection() {
      const dbPath = this.settings.databasePath;
      
      if (!dbPath) {
        this.uiManager.showSnackbar('No database configured to test!');
        return;
      }
  
      try {
        this.elements.testConnectionBtn.disabled = true;
        this.elements.testConnectionBtn.textContent = 'Testing...';
  
        const result = await window.electronAPI.settings.checkDatabase(dbPath);
        
        if (result.exists) {
          this.uiManager.showSnackbar('Database connection successful!');
          await this.updateDatabaseStatus();
        } else {
          this.uiManager.showSnackbar('Database file not found!');
          this.updateDatabaseStatus('not-configured', 'Database file not found');
        }
        
      } catch (error) {
        console.error('Error testing database:', error);
        this.uiManager.showSnackbar('Database connection test failed');
      } finally {
        this.elements.testConnectionBtn.disabled = false;
        this.elements.testConnectionBtn.textContent = 'Test Connection';
      }
    }
  
    /**
     * Update database status indicator
     */
    async updateDatabaseStatus(status = null, message = null) {
      const statusElement = this.elements.dbStatus;
      
      if (status && message) {
        // Manual status override
        statusElement.className = `db-status ${status}`;
        statusElement.innerHTML = `
          <span class="status-icon">${this.getStatusIcon(status)}</span>
          <span class="status-text">${message}</span>
        `;
        return;
      }
  
      // Auto-detect status
      if (!this.settings.databasePath) {
        statusElement.className = 'db-status not-configured';
        statusElement.innerHTML = `
          <span class="status-icon">⚠️</span>
          <span class="status-text">No database configured</span>
        `;
        this.elements.testConnectionBtn.disabled = true;
        return;
      }
  
      try {
        const result = await window.electronAPI.settings.checkDatabase(this.settings.databasePath);
        
        if (result.exists) {
          const sizeText = result.size ? this.formatFileSize(result.size) : 'Unknown size';
          statusElement.className = 'db-status configured';
          statusElement.innerHTML = `
            <span class="status-icon">✅</span>
            <span class="status-text">Database found (${sizeText})</span>
          `;
          this.elements.testConnectionBtn.disabled = false;
        } else {
          statusElement.className = 'db-status not-configured';
          statusElement.innerHTML = `
            <span class="status-icon">❌</span>
            <span class="status-text">Database file not found</span>
          `;
          this.elements.testConnectionBtn.disabled = true;
        }
      } catch (error) {
        statusElement.className = 'db-status not-configured';
        statusElement.innerHTML = `
          <span class="status-icon">❌</span>
          <span class="status-text">Error checking database</span>
        `;
        this.elements.testConnectionBtn.disabled = true;
      }
    }
  
    /**
     * Get status icon for different states
     */
    getStatusIcon(status) {
      const icons = {
        'not-configured': '⚠️',
        'configured': '✅',
        'loading': '⏳'
      };
      return icons[status] || '❓';
    }
  
    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
  
    /**
     * Update save button state based on current values
     */
    updateSaveButtonState() {
      const dbPath = this.elements.dbPathInput.value.trim();
      const hasChanged = dbPath !== this.settings.databasePath;
      const isValid = dbPath.length > 0;
      
      this.elements.saveSettingsBtn.disabled = !hasChanged || !isValid;
    }
  
    /**
     * Load settings from localStorage
     */
    loadSettings() {
      try {
        const saved = localStorage.getItem('htv-library-settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          this.settings = { ...this.settings, ...parsed };
        }
        
        // Update UI with loaded settings
        if (this.settings.databasePath) {
          this.elements.dbPathInput.value = this.settings.databasePath;
        }
        
        this.updateSaveButtonState();
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  
    /**
     * Save settings to localStorage
     */
    saveSettingsToStorage() {
      try {
        localStorage.setItem('htv-library-settings', JSON.stringify(this.settings));
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    }
  
    /**
     * Load and display app information
     */
    async loadAppInfo() {
      try {
        const appInfo = await window.electronAPI.settings.getAppInfo();
        
        this.elements.appVersion.textContent = appInfo.version || '1.0.0';
        this.elements.appPlatform.textContent = this.formatPlatform(appInfo.platform);
        this.elements.electronVersion.textContent = appInfo.electronVersion || 'Unknown';
        
      } catch (error) {
        console.error('Error loading app info:', error);
        this.elements.appPlatform.textContent = 'Unknown';
        this.elements.electronVersion.textContent = 'Unknown';
      }
    }
  
    /**
     * Format platform name for display
     */
    formatPlatform(platform) {
      const platforms = {
        'win32': 'Windows',
        'darwin': 'macOS',
        'linux': 'Linux'
      };
      return platforms[platform] || platform || 'Unknown';
    }
  
    /**
     * Check if database is properly configured
     * @returns {boolean}
     */
    isDatabaseConfigured() {
      return !!this.settings.databasePath;
    }
  
    /**
     * Get current database path
     * @returns {string|null}
     */
    getDatabasePath() {
      return this.settings.databasePath;
    }
  
    /**
     * Get current settings
     * @returns {Object}
     */
    getSettings() {
      return { ...this.settings };
    }
  
    /**
     * Reset all settings
     */
    resetSettings() {
      this.settings = {
        databasePath: null
      };
      this.elements.dbPathInput.value = '';
      this.saveSettingsToStorage();
      this.updateDatabaseStatus();
      this.updateSaveButtonState();
      this.uiManager.showSnackbar('Settings reset to defaults');
    }
  }
  
  window.SettingsManager = SettingsManager;
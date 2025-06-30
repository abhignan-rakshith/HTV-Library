class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.settingsManager = null;
    this.databaseManager = new DatabaseManager();
    this.duplicateResolver = null;
    this.webview = null;
    this.fab = null;
    this.currentData = null;
    this.imagePageController = null;
    this.currentPage = 'home-page';
    this.lastWebviewUrl = null;
    
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  async setupUI() {
    console.log('Setting up UI...');
    
    // Get UI elements
    this.webview = this.uiManager.getWebview();
    this.fab = this.uiManager.getFAB();

    console.log('Webview found:', !!this.webview);
    console.log('FAB found:', !!this.fab);

    // Set up tab navigation first
    this.setupTabNavigation();

    // Initialize settings manager
    try {
      this.settingsManager = new SettingsManager(this.uiManager, this.databaseManager);
      
      // Set callback for database configuration events
      this.settingsManager.setOnDatabaseConfigured(() => {
        this.loadPlaylistsFromDatabase();
      });
      
      // Check if database is already configured and initialize if needed
      if (this.settingsManager.isDatabaseConfigured()) {
        const dbPath = this.settingsManager.getDatabasePath();
        console.log('AppController: Database already configured, initializing...');
        await this.initializeDatabase(dbPath);
      }
      
    } catch (error) {
      console.error('Error initializing settings manager:', error);
    }

    // Set up webview and FAB functionality if available
    if (this.webview && this.fab) {
      // Initialize image page controller
      this.imagePageController = new ImagePageController(this.webview, this.uiManager);
      if (this.settingsManager) {
        this.imagePageController.setSettingsManager(this.settingsManager);
      }
      if (this.databaseManager) {
        this.imagePageController.setDatabaseManager(this.databaseManager);
      }

      this.setupWebviewEvents();
      this.setupFABEvents();
    } else {
      console.warn('Webview or FAB not found, skipping related setup');
    }

    // Set up modal events
    this.setupModalEvents();
    
    // Override UI manager's database loading method
    this.uiManager.loadPlaylistsFromDatabase = () => this.loadPlaylistsFromDatabase();
    
    console.log('UI setup complete');
  }

  /**
   * Initialize database and duplicate resolver
   * @param {string} dbPath - Database file path
   * @returns {Promise<void>}
   */
  async initializeDatabase(dbPath) {
    try {
      console.log('Initializing database:', dbPath);
      
      const success = await this.databaseManager.initialize(dbPath);
      
      if (success) {
        // Initialize duplicate resolver
        this.duplicateResolver = new DuplicateResolver(this.uiManager, this.databaseManager);
        
        // Update image controller with database manager
        if (this.imagePageController) {
          this.imagePageController.setDatabaseManager(this.databaseManager);
          this.imagePageController.setDuplicateResolver(this.duplicateResolver);
        }
        
        console.log('Database and duplicate resolver initialized successfully');
        
        // Load playlists after database is ready
        await this.loadPlaylistsFromDatabase();
        
      } else {
        console.error('Failed to initialize database');
        this.uiManager.showSnackbar('Database initialization failed');
      }
      
    } catch (error) {
      console.error('Error initializing database:', error);
      this.uiManager.showSnackbar('Database connection error');
    }
  }

  setupWebviewEvents() {
    if (!this.webview) return;
    
    this.webview.addEventListener('dom-ready', () => {
      this.autoCloseAds();
      this.handleWebviewUrlChange();
    });

    this.webview.addEventListener('did-navigate', () => {
      console.log('AppController: Webview navigation detected');
      this.handleWebviewUrlChange();
      setTimeout(() => this.autoCloseAds(), 2000);
    });

    this.webview.addEventListener('did-navigate-in-page', () => {
      console.log('AppController: In-page navigation detected');
      this.handleWebviewUrlChange();
    });
  }

  async handleWebviewUrlChange() {
    if (!this.webview) return;

    const currentUrl = this.webview.getURL();
    console.log('AppController: URL changed to:', currentUrl);

    if (this.lastWebviewUrl && this.scraper.isImagesPage(this.lastWebviewUrl)) {
      if (!this.scraper.isImagesPage(currentUrl)) {
        console.log('AppController: Left images page, clearing state');
        await this.forceResetImageState();
      }
    }

    this.lastWebviewUrl = currentUrl;
  }

  async autoCloseAds() {
    if (!this.webview) return;
    
    try {
      await this.webview.executeJavaScript(`
        (function() {
          function closeAds() {
            const selectors = [
              '.unit__close',
              'button.unit__close',
              '[class*="unit__close"]'
            ];
            
            let closedCount = 0;
            
            selectors.forEach(selector => {
              try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(button => {
                  const content = button.textContent || '';
                  if (content.toLowerCase().includes('close') && 
                      content.toLowerCase().includes('ad')) {
                    button.click();
                    closedCount++;
                  }
                });
              } catch (e) {
                // Silently handle selector errors
              }
            });
            
            const adContainers = document.querySelectorAll('.htvad, [class*="htvad"]');
            adContainers.forEach(container => {
              if (container.style) {
                container.style.display = 'none';
                closedCount++;
              }
            });
            
            return closedCount;
          }
          
          return closeAds();
        })()
      `);
    } catch (error) {
      // Silently handle execution errors
    }
  }

  setupFABEvents() {
    if (!this.fab) return;
    
    console.log('Setting up FAB events...');
    this.fab.addEventListener('click', () => {
      console.log('FAB clicked!');
      this.handleFABClick();
    });
  }

  setupModalEvents() {
    // Video modal events - now includes playlist parameter
    this.uiManager.setupModalEvents(
      (plotValue, playlistValue) => this.handleVideoSave(plotValue, playlistValue),
      () => this.handleVideoCancel()
    );
    
    // Image save modal events
    this.uiManager.setupImageSaveModalEvents(
      (tag, comments) => this.handleImageSave(tag, comments),
      () => this.handleImageCancel()
    );
  }

  /**
   * Load playlists from database for dropdown population
   * @returns {Promise<void>}
   */
  async loadPlaylistsFromDatabase() {
    console.log('AppController: Loading playlists from database...');
    
    if (!this.isDatabaseConfigured()) {
      console.log('AppController: Database not configured, clearing playlist dropdown');
      this.uiManager.populatePlaylistDropdown([]);
      return;
    }

    if (!this.databaseManager) {
      console.log('AppController: Database manager not available, clearing playlist dropdown');
      this.uiManager.populatePlaylistDropdown([]);
      return;
    }

    try {
      const playlists = await this.databaseManager.getPlaylists();
      this.uiManager.populatePlaylistDropdown(playlists);
      
      if (playlists.length === 0) {
        console.log('AppController: No playlists found in database - dropdown will be empty');
      } else {
        console.log('AppController: Loaded', playlists.length, 'playlists from database');
      }
      
    } catch (error) {
      console.error('AppController: Error loading playlists:', error);
      this.uiManager.populatePlaylistDropdown([]);
    }
  }

  setupTabNavigation() {
    console.log('Setting up tab navigation...');
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const pages = document.querySelectorAll('.page');

    console.log('Found tab buttons:', tabButtons.length);
    console.log('Found pages:', pages.length);

    tabButtons.forEach((button, index) => {
      const targetPage = button.getAttribute('data-page');
      console.log(`Tab ${index}: targets ${targetPage}`);
      
      button.addEventListener('click', (e) => {
        console.log('Tab clicked:', targetPage);
        e.preventDefault();
        this.switchToPage(targetPage);
      });
    });
  }

  async switchToPage(pageId) {
    console.log('AppController: Switching to page:', pageId);
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const pages = document.querySelectorAll('.page');

    if (this.currentPage === 'home-page' && pageId !== 'home-page') {
      console.log('AppController: Leaving home page via tab, force reset image state');
      await this.forceResetImageState();
    }

    tabButtons.forEach(button => {
      const isActive = button.getAttribute('data-page') === pageId;
      button.classList.toggle('active', isActive);
    });

    pages.forEach(page => {
      const isActive = page.id === pageId;
      page.classList.toggle('active', isActive);
      console.log(`Page ${page.id}: active = ${isActive}`);
    });

    if (this.fab) {
      this.fab.style.display = pageId === 'home-page' ? 'flex' : 'none';
    }

    this.currentPage = pageId;
    console.log('AppController: Page switch complete, current page:', this.currentPage);
  }

  async forceResetImageState() {
    console.log('AppController: Force resetting image state...');
    
    if (this.imagePageController) {
      await this.imagePageController.forceCompleteReset();
    } else {
      this.uiManager.clearFABCounter();
    }
    
    console.log('AppController: Image state reset complete');
  }

  async handleFABClick() {
    console.log('AppController: Handling FAB click...');
    
    if (!this.webview) {
      this.uiManager.showSnackbar('Webview not available!');
      return;
    }

    const currentUrl = this.webview.getURL();
    console.log('AppController: Current URL:', currentUrl);

    if (this.scraper.isVideoPage(currentUrl)) {
      await this.handleVideoPageScraping();
    } else if (this.scraper.isImagesPage(currentUrl)) {
      if (this.imagePageController) {
        await this.imagePageController.handleFABClick();
      } else {
        this.uiManager.showSnackbar('Image controller not available!');
      }
    } else {
      this.uiManager.showSnackbar('Please navigate to a media page!');
    }
  }

  async handleVideoPageScraping() {
    this.uiManager.showSnackbar('Extracting content...');

    const result = await this.scraper.scrapeVideoPage(this.webview);

    if (result.success) {
      this.currentData = result.data;
      this.uiManager.showSnackbar('Content extracted successfully!');
      this.uiManager.showModal(result.data);
    } else if (result.error) {
      this.uiManager.showSnackbar('Extraction failed');
    } else {
      const count = result.missingElements.length;
      this.uiManager.showSnackbar(`Missing ${count} elements`);
    }
  }

  isDatabaseConfigured() {
    return this.settingsManager ? this.settingsManager.isDatabaseConfigured() : false;
  }

  /**
   * Handle video save with duplicate detection
   * @param {string} plotValue - Plot text
   * @param {string} playlistValue - Playlist name
   */
  async handleVideoSave(plotValue, playlistValue) {
    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving video');
      return;
    }

    if (!this.duplicateResolver) {
      this.uiManager.showSnackbar('Database not ready - please try again');
      return;
    }

    if (this.currentData) {
      // Update data with user inputs
      this.currentData.plot = plotValue;
      this.currentData.playlist = playlistValue;
      
      console.log('AppController: Checking for video duplicates...');
      
      // Check for duplicates and handle resolution
      await this.duplicateResolver.checkAndResolveVideoDuplicate(
        this.currentData,
        (result) => {
          if (result.success) {
            let message = '';
            switch (result.action) {
              case 'inserted':
                message = 'Video saved to library!';
                break;
              case 'updated':
                message = 'Video updated in library!';
                break;
              case 'kept_existing':
                message = 'Existing video kept - no changes made';
                break;
              default:
                message = 'Video processed successfully!';
            }
            this.uiManager.showSnackbar(message);
            
            // Reload playlists in case a new one was added
            this.loadPlaylistsFromDatabase();
            
          } else {
            this.uiManager.showSnackbar('Failed to save video: ' + (result.error || 'Unknown error'));
          }
        }
      );
    }
  }

  handleVideoCancel() {
    this.currentData = null;
  }

  async handleImageSave(tag, comments) {
    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving images');
      return;
    }

    if (this.imagePageController) {
      await this.imagePageController.saveSelectedImages(tag, comments);
    }
  }

  async handleImageCancel() {
    if (this.imagePageController) {
      await this.imagePageController.cancelImageSelection();
    }
  }

  /**
   * Get current application state
   * @returns {Object}
   */
  getAppState() {
    const state = {
      currentUrl: this.webview ? this.webview.getURL() : null,
      hasVideoData: !!this.currentData,
      imageSelection: null,
      isDatabaseConfigured: this.isDatabaseConfigured(),
      currentPage: this.currentPage,
      settings: this.settingsManager ? this.settingsManager.getSettings() : {},
      databaseReady: !!this.duplicateResolver
    };

    if (this.imagePageController) {
      state.imageSelection = this.imagePageController.getSelectionState();
    }

    return state;
  }

  openSettings() {
    this.switchToPage('settings-page');
  }

  openHome() {
    this.switchToPage('home-page');
  }

  isOnSettingsPage() {
    return this.currentPage === 'settings-page';
  }

  /**
   * Get database statistics for display
   * @returns {Promise<Object>}
   */
  async getDatabaseStats() {
    if (!this.databaseManager || !this.isDatabaseConfigured()) {
      return null;
    }
    
    try {
      return await this.databaseManager.getStats();
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  destroy() {
    if (this.imagePageController) {
      this.imagePageController.destroy();
    }
    if (this.duplicateResolver) {
      this.duplicateResolver.destroy();
    }
    if (this.databaseManager) {
      this.databaseManager.close();
    }
  }
}

window.AppController = AppController;
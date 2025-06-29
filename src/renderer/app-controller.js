class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.settingsManager = null;
    this.webview = null;
    this.fab = null;
    this.currentData = null;
    this.imagePageController = null;
    this.currentPage = 'home-page';
    this.lastWebviewUrl = null; // Track URL changes
    
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

    // Set up tab navigation first (this should always work)
    this.setupTabNavigation();

    // Initialize settings manager (don't let this block other setup)
    try {
      this.settingsManager = new SettingsManager(this.uiManager);
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

  /**
   * Handle webview URL changes and clear state when leaving images page
   */
  async handleWebviewUrlChange() {
    if (!this.webview) return;

    const currentUrl = this.webview.getURL();
    console.log('AppController: URL changed to:', currentUrl);

    // Check if we're leaving the images page
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
      console.log('AppController: Database not configured, skipping playlist load');
      this.uiManager.populatePlaylistDropdown([]);
      return;
    }

    try {
      // TODO: Replace with actual database query when implemented
      // For now, return empty array since DB layer isn't built yet
      const playlists = await this.queryPlaylistsFromDatabase();
      this.uiManager.populatePlaylistDropdown(playlists);
      
    } catch (error) {
      console.error('AppController: Error loading playlists:', error);
      this.uiManager.populatePlaylistDropdown([]);
    }
  }

  /**
   * Query playlists from database - placeholder for actual implementation
   * @returns {Promise<string[]>}
   * @private
   */
  async queryPlaylistsFromDatabase() {
    // TODO: Implement actual database query
    // For now, return empty array since DB layer isn't implemented yet
    // This will be replaced with actual SQL query: 
    // SELECT DISTINCT playlist FROM shows WHERE playlist IS NOT NULL AND playlist != '' ORDER BY playlist
    
    console.log('AppController: Querying playlists (placeholder implementation)');
    return [];
  }

  /**
   * Setup tab navigation functionality
   */
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

  /**
   * Switch between app pages
   * @param {string} pageId - The ID of the page to switch to
   */
  async switchToPage(pageId) {
    console.log('AppController: Switching to page:', pageId);
    
    const tabButtons = document.querySelectorAll('.tab-button');
    const pages = document.querySelectorAll('.page');

    // Force complete reset when navigating away from home page (tab switching)
    if (this.currentPage === 'home-page' && pageId !== 'home-page') {
      console.log('AppController: Leaving home page via tab, force reset image state');
      await this.forceResetImageState();
    }

    // Update tab active states
    tabButtons.forEach(button => {
      const isActive = button.getAttribute('data-page') === pageId;
      button.classList.toggle('active', isActive);
    });

    // Update page visibility
    pages.forEach(page => {
      const isActive = page.id === pageId;
      page.classList.toggle('active', isActive);
      console.log(`Page ${page.id}: active = ${isActive}`);
    });

    // Update FAB visibility (only show on home page)
    if (this.fab) {
      this.fab.style.display = pageId === 'home-page' ? 'flex' : 'none';
    }

    this.currentPage = pageId;
    console.log('AppController: Page switch complete, current page:', this.currentPage);
  }

  /**
   * Force complete reset of image selection state
   * @returns {Promise<void>}
   */
  async forceResetImageState() {
    console.log('AppController: Force resetting image state...');
    
    if (this.imagePageController) {
      await this.imagePageController.forceCompleteReset();
    } else {
      // Fallback: clear FAB counter directly
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

  /**
   * Check if database is configured
   * @returns {boolean}
   * @private
   */
  isDatabaseConfigured() {
    return this.settingsManager ? this.settingsManager.isDatabaseConfigured() : false;
  }

  handleVideoSave(plotValue, playlistValue) {
    // Check if database is configured before saving
    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving video');
      return;
    }

    if (this.currentData) {
      this.currentData.plot = plotValue;
      this.currentData.playlist = playlistValue; // Add playlist to data
      this.uiManager.showSnackbar('Saved to library!');
      
      // TODO: Add actual database save functionality here
      console.log('Video data saved:', this.currentData);
      console.log('Database path:', this.settingsManager.getDatabasePath());
      console.log('Playlist (capitalized):', playlistValue);
    }
  }

  handleVideoCancel() {
    this.currentData = null;
  }

  async handleImageSave(tag, comments) {
    // Check if database is configured before saving
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
      settings: this.settingsManager ? this.settingsManager.getSettings() : {}
    };

    if (this.imagePageController) {
      state.imageSelection = this.imagePageController.getSelectionState();
    }

    return state;
  }

  /**
   * Navigate to settings page
   */
  openSettings() {
    this.switchToPage('settings-page');
  }

  /**
   * Navigate to home page
   */
  openHome() {
    this.switchToPage('home-page');
  }

  /**
   * Check if currently on settings page
   * @returns {boolean}
   */
  isOnSettingsPage() {
    return this.currentPage === 'settings-page';
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.imagePageController) {
      this.imagePageController.destroy();
    }
  }
}

window.AppController = AppController;
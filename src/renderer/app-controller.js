class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.webview = null;
    this.fab = null;
    this.currentData = null;
    this.imagePageController = null;
    
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  setupUI() {
    this.webview = this.uiManager.getWebview();
    this.fab = this.uiManager.getFAB();

    if (!this.webview || !this.fab) {
      return;
    }

    // Initialize image page controller
    this.imagePageController = new ImagePageController(this.webview, this.uiManager);

    this.setupWebviewEvents();
    this.setupFABEvents();
    this.setupModalEvents();
  }

  setupWebviewEvents() {
    this.webview.addEventListener('dom-ready', () => {
      this.autoCloseAds();
    });

    this.webview.addEventListener('did-navigate', () => {
      // Clear any existing image selections when navigating
      if (this.imagePageController) {
        this.imagePageController.clearSelectionsAndExit();
      }
      
      setTimeout(() => this.autoCloseAds(), 2000);
    });
  }

  async autoCloseAds() {
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
    this.fab.addEventListener('click', () => this.handleFABClick());
  }

  setupModalEvents() {
    // Video modal events
    this.uiManager.setupModalEvents(
      (plotValue) => this.handleVideoSave(plotValue),
      () => this.handleVideoCancel()
    );
    
    // Image save modal events
    this.uiManager.setupImageSaveModalEvents(
      (tag, comments) => this.handleImageSave(tag, comments),
      () => this.handleImageCancel()
    );
  }

  async handleFABClick() {
    const currentUrl = this.webview.getURL();

    if (this.scraper.isVideoPage(currentUrl)) {
      await this.handleVideoPageScraping();
    } else if (this.scraper.isImagesPage(currentUrl)) {
      await this.imagePageController.handleFABClick();
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

  handleVideoSave(plotValue) {
    if (this.currentData) {
      this.currentData.plot = plotValue;
      this.uiManager.showSnackbar('Saved to library!');
      
      // TODO: Add actual database save functionality here
      console.log('Video data saved:', this.currentData);
    }
  }

  handleVideoCancel() {
    this.currentData = null;
  }

  async handleImageSave(tag, comments) {
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
      imageSelection: null
    };

    if (this.imagePageController) {
      state.imageSelection = this.imagePageController.getSelectionState();
    }

    return state;
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
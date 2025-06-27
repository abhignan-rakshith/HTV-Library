class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.webview = null;
    this.fab = null;
    this.currentData = null;
    
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

    this.setupWebviewEvents();
    this.setupFABEvents();
    this.setupModalEvents();
  }

  setupWebviewEvents() {
    this.webview.addEventListener('dom-ready', () => {
      // Auto-close ads when page loads
      this.autoCloseAds();
    });

    this.webview.addEventListener('did-navigate', () => {
      // Auto-close ads on navigation
      setTimeout(() => this.autoCloseAds(), 1000);
    });
  }

  async autoCloseAds() {
    try {
      await this.webview.executeJavaScript(`
        (function() {
          // Function to close ads
          function closeAds() {
            // Find all ad close buttons using various selectors
            const selectors = [
              '.unit__close',
              'button.unit__close',
              '[class*="unit__close"]',
              'button:has(.btn__content):has([class*="close"])',
              'button[class*="close"]:has(.btn__content)'
            ];
            
            let closedCount = 0;
            
            selectors.forEach(selector => {
              try {
                const buttons = document.querySelectorAll(selector);
                buttons.forEach(button => {
                  // Check if it's actually an ad close button
                  const content = button.textContent || '';
                  if (content.toLowerCase().includes('close') && 
                      content.toLowerCase().includes('ad')) {
                    button.click();
                    closedCount++;
                  }
                });
              } catch (e) {
                // Ignore selector errors
              }
            });
            
            // Also try to find and hide ad containers directly
            const adContainers = document.querySelectorAll('.htvad, [class*="htvad"]');
            adContainers.forEach(container => {
              if (container.style) {
                container.style.display = 'none';
                closedCount++;
              }
            });
            
            return closedCount;
          }
          
          // Close ads immediately
          let closed = closeAds();
          
          // Set up observer for dynamically loaded ads
          const observer = new MutationObserver(() => {
            closeAds();
          });
          
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          
          // Cleanup observer after 30 seconds to avoid memory leaks
          setTimeout(() => observer.disconnect(), 30000);
          
          return closed;
        })()
      `);
    } catch (error) {
      // Silently fail if webview isn't ready
    }
  }

  setupFABEvents() {
    this.fab.addEventListener('click', () => this.handleFABClick());
  }

  setupModalEvents() {
    this.uiManager.setupModalEvents(
      (plotValue) => this.handleSave(plotValue),
      () => this.handleCancel()
    );
  }

  async handleFABClick() {
    const currentUrl = this.webview.getURL();

    if (this.scraper.isVideoPage(currentUrl)) {
      await this.handleVideoPageScraping();
    } else if (this.scraper.isImagesPage(currentUrl)) {
      this.handleImagesPage();
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

  handleImagesPage() {
    this.uiManager.showSnackbar('Images page detected');
  }

  handleSave(plotValue) {
    if (this.currentData) {
      this.currentData.plot = plotValue;
      this.uiManager.showSnackbar('Saved to library!');
      // Future: Add actual save functionality here
    }
  }

  handleCancel() {
    this.currentData = null;
  }
}

window.AppController = AppController;
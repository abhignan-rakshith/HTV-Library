/**
 * Main application controller that coordinates UI and scraping functionality
 */
class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.webview = null;
    this.fab = null;
    
    this.init();
  }

  /**
   * Initialize the application
   */
  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  /**
   * Set up UI elements and event listeners
   */
  setupUI() {
    this.webview = this.uiManager.getWebview();
    this.fab = this.uiManager.getFAB();

    if (!this.webview || !this.fab) {
      return;
    }

    this.setupWebviewEvents();
    this.setupFABEvents();
  }

  /**
   * Configure webview event listeners
   */
  setupWebviewEvents() {
    // Handle webview ready state
    this.webview.addEventListener('dom-ready', () => {
      console.log('Webview ready');
    });

    // Handle navigation events
    this.webview.addEventListener('did-navigate', (event) => {
      console.log('Navigated to:', event.url);
    });
  }

  /**
   * Configure floating action button events
   */
  setupFABEvents() {
    this.fab.addEventListener('click', () => this.handleFABClick());
  }

  /**
   * Handle floating action button click
   */
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

  /**
   * Handle video page scraping
   */
  async handleVideoPageScraping() {
    this.uiManager.showSnackbar('Scraping page content...');

    const result = await this.scraper.scrapeVideoPage(this.webview);

    if (result.success) {
      this.uiManager.showSnackbar('Content extracted successfully!');
      console.log('Scraped data:', result.data);
    } else if (result.error) {
      this.uiManager.showSnackbar('Error extracting content');
      console.error('Scraping error:', result.error);
    } else {
      const missingCount = result.missingElements.length;
      this.uiManager.showSnackbar(`Missing ${missingCount} elements`);
    }
  }

  /**
   * Handle images page interaction
   */
  handleImagesPage() {
    this.uiManager.showSnackbar('Images page detected');
    // Placeholder for future images functionality
  }
}

// Export for use in main renderer
window.AppController = AppController;
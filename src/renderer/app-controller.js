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
      // Webview is ready for interaction
    });
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
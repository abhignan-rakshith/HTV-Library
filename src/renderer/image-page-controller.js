/**
 * ImagePageController - Orchestrates image page functionality
 */
class ImagePageController {
  constructor(webview, uiManager) {
    this.webview = webview;
    this.uiManager = uiManager;
    this.selectionManager = new ImageSelectionManager();
    this.injector = new ImageInjector();
    this.counterUpdateInterval = null;
    this.settingsManager = null; // Will be injected by AppController
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
    // Listen for selection changes to update UI
    this.selectionManager.onSelectionChange((data) => {
      this.uiManager.updateFABCounter(data.count);
    });
  }

  /**
   * Set the settings manager instance
   * @param {SettingsManager} settingsManager
   */
  setSettingsManager(settingsManager) {
    this.settingsManager = settingsManager;
  }

  /**
   * Check if database is configured
   * @returns {boolean}
   * @private
   */
  isDatabaseConfigured() {
    return this.settingsManager ? this.settingsManager.isDatabaseConfigured() : false;
  }

  /**
   * Handle FAB click on images page
   * @returns {Promise<void>}
   */
  async handleFABClick() {
    console.log('ImagePageController: FAB clicked, selection mode:', this.selectionManager.isInSelectionMode());
    
    if (this.selectionManager.isInSelectionMode()) {
      await this.processSelectedImages();
    } else {
      await this.enterSelectionMode();
    }
  }

  /**
   * Enter image selection mode
   * @returns {Promise<void>}
   * @private
   */
  async enterSelectionMode() {
    console.log('ImagePageController: Entering selection mode...');
    
    this.selectionManager.enterSelectionMode();
    
    // Inject click handlers
    const injected = await this.injector.injectClickHandler(this.webview);
    if (!injected) {
      this.uiManager.showSnackbar('Failed to setup image selection');
      this.selectionManager.exitSelectionMode();
      return;
    }
    
    this.uiManager.showSnackbar('Select images and click the button again');
    this.startCounterUpdates();
  }

  /**
   * Process selected images
   * @returns {Promise<void>}
   * @private
   */
  async processSelectedImages() {
    console.log('ImagePageController: Processing selected images...');
    
    // Get current selections from webview (this is the real state)
    const selectedUrls = await this.injector.getSelectedUrls(this.webview);
    console.log('ImagePageController: URLs from webview:', selectedUrls.length);
    
    if (selectedUrls.length === 0) {
      this.uiManager.showSnackbar('No images selected. Please select some images first.');
      return;
    }

    // Check if database is configured before showing save modal
    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving images');
      return;
    }

    // Update internal state to match webview reality
    this.selectionManager.exitSelectionMode(); // Clear old state
    this.selectionManager.enterSelectionMode(); // Re-enter clean
    selectedUrls.forEach(url => this.selectionManager.toggleSelection(url));
    
    // Show save modal
    this.uiManager.showImageSaveModal(selectedUrls.length);
  }

  /**
   * Save selected images with metadata
   * @param {string} tag - Required tag for images
   * @param {string} comments - Optional comments
   * @returns {Promise<void>}
   */
  async saveSelectedImages(tag, comments) {
    if (!tag || tag.trim() === '') {
      this.uiManager.showSnackbar('Tag is required!');
      return;
    }

    // Double-check database configuration (though should be caught earlier)
    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving images');
      return;
    }

    const selectedUrls = this.selectionManager.getSelectedUrls();
    
    const imageData = {
      urls: selectedUrls,
      tag: tag.trim(),
      comments: comments ? comments.trim() : '',
      sourceUrl: this.webview.getURL(),
      savedAt: new Date().toISOString()
    };

    try {
      // TODO: Add actual database saving logic here
      console.log('Saving images with data:', imageData);
      console.log('Database path:', this.settingsManager ? this.settingsManager.getDatabasePath() : 'Not configured');
      
      this.uiManager.showSnackbar(`Successfully saved ${selectedUrls.length} images with tag "${tag}"!`);
      
      // Clear selections and exit mode
      await this.clearSelectionsAndExit();
      
    } catch (error) {
      console.error('Error saving images:', error);
      this.uiManager.showSnackbar('Error saving images to library');
    }
  }

  /**
   * Cancel image selection without saving
   * @returns {Promise<void>}
   */
  async cancelImageSelection() {
    // Just close modal, keep selections
    console.log('Image save cancelled');
  }

  /**
   * Clear all selections and exit selection mode - COMPLETE RESET
   * @returns {Promise<void>}
   */
  async clearSelectionsAndExit() {
    console.log('ImagePageController: Complete clear and exit...');
    
    try {
      // 1. Clear selections in webview first
      await this.injector.clearSelections(this.webview);
      console.log('ImagePageController: Webview selections cleared');
      
      // 2. Exit selection mode in manager
      this.selectionManager.exitSelectionMode();
      console.log('ImagePageController: Selection mode exited');
      
      // 3. Stop counter updates and clear UI
      this.stopCounterUpdates();
      this.uiManager.clearFABCounter();
      console.log('ImagePageController: UI cleared');
      
      // 4. Reset injection state
      await this.resetInjectionState();
      console.log('ImagePageController: Injection state reset');
      
    } catch (error) {
      console.error('Error in clearSelectionsAndExit:', error);
    }
  }

  /**
   * Reset injection state to ensure clean slate
   * @returns {Promise<void>}
   * @private
   */
  async resetInjectionState() {
    try {
      await this.webview.executeJavaScript(`
        // Reset all injection-related globals
        if (window.imageClickHandlerInjected) {
          window.imageClickHandlerInjected = false;
        }
        if (window.selectedImageUrls) {
          window.selectedImageUrls.clear();
        }
        // Remove all visual indicators
        document.querySelectorAll('.htv-selection-indicator').forEach(indicator => {
          indicator.remove();
        });
        console.log('Injection state reset complete');
      `);
    } catch (error) {
      console.error('Error resetting injection state:', error);
    }
  }

  /**
   * Force complete state reset - called when navigating away
   * @returns {Promise<void>}
   */
  async forceCompleteReset() {
    console.log('ImagePageController: Force complete reset...');
    
    // Stop any ongoing processes
    this.stopCounterUpdates();
    
    // Reset all state
    this.selectionManager.exitSelectionMode();
    this.uiManager.clearFABCounter();
    
    // Reset webview state
    await this.resetInjectionState();
    
    console.log('ImagePageController: Force reset complete');
  }

  /**
   * Start periodic counter updates
   * @private
   */
  startCounterUpdates() {
    this.counterUpdateInterval = setInterval(async () => {
      if (this.selectionManager.isInSelectionMode()) {
        try {
          const count = await this.injector.getSelectionCount(this.webview);
          this.uiManager.updateFABCounter(count);
        } catch (error) {
          console.error('Error updating counter:', error);
        }
      }
    }, 500);
  }

  /**
   * Stop periodic counter updates
   * @private
   */
  stopCounterUpdates() {
    if (this.counterUpdateInterval) {
      clearInterval(this.counterUpdateInterval);
      this.counterUpdateInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopCounterUpdates();
    this.selectionManager.onSelectionChangeCallbacks = [];
  }

  /**
   * Get current selection state
   * @returns {Object}
   */
  getSelectionState() {
    return {
      isSelectionMode: this.selectionManager.isInSelectionMode(),
      selectedCount: this.selectionManager.getSelectionCount(),
      selectedUrls: this.selectionManager.getSelectedUrls(),
      isDatabaseConfigured: this.isDatabaseConfigured()
    };
  }
}

window.ImagePageController = ImagePageController;
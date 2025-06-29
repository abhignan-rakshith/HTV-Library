/**
 * ImagePageController - Orchestrates image page functionality with database integration
 */
class ImagePageController {
  constructor(webview, uiManager) {
    this.webview = webview;
    this.uiManager = uiManager;
    this.selectionManager = new ImageSelectionManager();
    this.injector = new ImageInjector();
    this.counterUpdateInterval = null;
    this.settingsManager = null;
    this.databaseManager = null;
    this.duplicateResolver = null;
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   * @private
   */
  setupEventListeners() {
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
   * Set the database manager instance
   * @param {DatabaseManager} databaseManager
   */
  setDatabaseManager(databaseManager) {
    this.databaseManager = databaseManager;
  }

  /**
   * Set the duplicate resolver instance
   * @param {DuplicateResolver} duplicateResolver
   */
  setDuplicateResolver(duplicateResolver) {
    this.duplicateResolver = duplicateResolver;
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
    
    const selectedUrls = await this.injector.getSelectedUrls(this.webview);
    console.log('ImagePageController: URLs from webview:', selectedUrls.length);
    
    if (selectedUrls.length === 0) {
      this.uiManager.showSnackbar('No images selected. Please select some images first.');
      return;
    }

    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving images');
      return;
    }

    // Update internal state to match webview reality
    this.selectionManager.exitSelectionMode();
    this.selectionManager.enterSelectionMode();
    selectedUrls.forEach(url => this.selectionManager.toggleSelection(url));
    
    // Show save modal (duplicate checking will happen when user clicks save)
    this.uiManager.showImageSaveModal(selectedUrls.length);
  }

  /**
   * Save selected images with metadata and duplicate detection
   * @param {string} tag - Required tag for images
   * @param {string} comments - Optional comments
   * @returns {Promise<void>}
   */
  async saveSelectedImages(tag, comments) {
    if (!tag || tag.trim() === '') {
      this.uiManager.showSnackbar('Tag is required!');
      return;
    }

    if (!this.isDatabaseConfigured()) {
      this.uiManager.showDatabaseConfigError('saving images');
      return;
    }

    if (!this.databaseManager || !this.duplicateResolver) {
      this.uiManager.showSnackbar('Database not ready - please try again');
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

    console.log('ImagePageController: Checking for image duplicates...');

    try {
      // Check for duplicates and handle resolution
      await this.duplicateResolver.checkAndResolveImageDuplicates(
        imageData,
        (result) => {
          if (result.success) {
            let message = '';
            if (result.saved && result.skipped) {
              message = `Saved ${result.saved} images, skipped ${result.skipped} duplicates`;
            } else if (result.saved) {
              message = `Successfully saved ${result.saved} images with tag "${tag}"!`;
            } else {
              message = 'Images processed successfully!';
            }
            
            this.uiManager.showSnackbar(message);
            
            // Clear selections and exit mode after successful save
            this.clearSelectionsAndExit();
            
          } else {
            this.uiManager.showSnackbar('Error saving images: ' + (result.error || 'Unknown error'));
          }
        }
      );
      
    } catch (error) {
      console.error('Error in duplicate detection/saving:', error);
      this.uiManager.showSnackbar('Error saving images to library');
    }
  }

  /**
   * Cancel image selection without saving
   * @returns {Promise<void>}
   */
  async cancelImageSelection() {
    console.log('ImagePageController: Image save cancelled');
    // Just close modal, keep selections for now
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
    
    this.stopCounterUpdates();
    this.selectionManager.exitSelectionMode();
    this.uiManager.clearFABCounter();
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
   * Get images from database by source URL (for debugging/verification)
   * @param {string} sourceUrl - Source page URL
   * @returns {Promise<Array>} - Array of image records
   */
  async getImagesBySource(sourceUrl) {
    if (!this.databaseManager) return [];
    
    try {
      // This would be implemented in the DatabaseManager
      // return await this.databaseManager.getImagesBySource(sourceUrl);
      console.log('Getting images for source:', sourceUrl);
      return [];
    } catch (error) {
      console.error('Error getting images by source:', error);
      return [];
    }
  }

  /**
   * Get image statistics for current page
   * @returns {Promise<Object>} - Image statistics
   */
  async getImageStats() {
    if (!this.databaseManager) return null;
    
    try {
      const sourceUrl = this.webview.getURL();
      const stats = {
        currentPageUrl: sourceUrl,
        selectedCount: this.selectionManager.getSelectionCount(),
        isSelectionMode: this.selectionManager.isInSelectionMode(),
        // Add more stats as needed
      };
      
      // Could add database queries here for existing images from this source
      return stats;
    } catch (error) {
      console.error('Error getting image stats:', error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stopCounterUpdates();
    this.selectionManager.onSelectionChangeCallbacks = [];
    this.settingsManager = null;
    this.databaseManager = null;
    this.duplicateResolver = null;
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
      isDatabaseConfigured: this.isDatabaseConfigured(),
      databaseReady: !!this.databaseManager && !!this.duplicateResolver
    };
  }
}

window.ImagePageController = ImagePageController;
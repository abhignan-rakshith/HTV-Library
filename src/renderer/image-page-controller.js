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
     * Handle FAB click on images page
     * @returns {Promise<void>}
     */
    async handleFABClick() {
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
      const selectedUrls = await this.injector.getSelectedUrls(this.webview);
      
      if (selectedUrls.length === 0) {
        this.uiManager.showSnackbar('No images selected. Please select some images first.');
        return;
      }
  
      // Update internal state
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
  
      const selectedUrls = this.selectionManager.getSelectedUrls();
      
      const imageData = {
        urls: selectedUrls,
        tag: tag.trim(),
        comments: comments ? comments.trim() : '',
        savedAt: new Date().toISOString()
      };
  
      try {
        // TODO: Add actual database saving logic here
        console.log('Saving images with data:', imageData);
        
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
     * Clear all selections and exit selection mode
     * @returns {Promise<void>}
     */
    async clearSelectionsAndExit() {
      // Clear selections in webview
      await this.injector.clearSelections(this.webview);
      
      // Update internal state
      this.selectionManager.exitSelectionMode();
      
      // Stop counter updates and clear UI
      this.stopCounterUpdates();
      this.uiManager.clearFABCounter();
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
        selectedUrls: this.selectionManager.getSelectedUrls()
      };
    }
  }
  
  window.ImagePageController = ImagePageController;
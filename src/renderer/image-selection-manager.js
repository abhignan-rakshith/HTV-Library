/**
 * ImageSelectionManager - Handles image selection state and operations
 */
class ImageSelectionManager {
    constructor() {
      this.selectedUrls = new Set();
      this.isSelectionMode = false;
      this.onSelectionChangeCallbacks = [];
    }
  
    /**
     * Enter selection mode
     */
    enterSelectionMode() {
      this.isSelectionMode = true;
      this.selectedUrls.clear();
      this.notifySelectionChange();
    }
  
    /**
     * Exit selection mode and clear all selections
     */
    exitSelectionMode() {
      this.isSelectionMode = false;
      this.selectedUrls.clear();
      this.notifySelectionChange();
    }
  
    /**
     * Toggle selection of an image URL
     * @param {string} imageUrl - The URL of the image to toggle
     * @returns {boolean} - True if image is now selected, false if unselected
     */
    toggleSelection(imageUrl) {
      if (!this.isSelectionMode) return false;
  
      if (this.selectedUrls.has(imageUrl)) {
        this.selectedUrls.delete(imageUrl);
        this.notifySelectionChange();
        return false;
      } else {
        this.selectedUrls.add(imageUrl);
        this.notifySelectionChange();
        return true;
      }
    }
  
    /**
     * Check if an image is selected
     * @param {string} imageUrl - The URL to check
     * @returns {boolean}
     */
    isSelected(imageUrl) {
      return this.selectedUrls.has(imageUrl);
    }
  
    /**
     * Get all selected URLs as an array
     * @returns {string[]}
     */
    getSelectedUrls() {
      return Array.from(this.selectedUrls);
    }
  
    /**
     * Get the count of selected images
     * @returns {number}
     */
    getSelectionCount() {
      return this.selectedUrls.size;
    }
  
    /**
     * Check if in selection mode
     * @returns {boolean}
     */
    isInSelectionMode() {
      return this.isSelectionMode;
    }
  
    /**
     * Add callback for selection changes
     * @param {Function} callback - Function to call when selection changes
     */
    onSelectionChange(callback) {
      this.onSelectionChangeCallbacks.push(callback);
    }
  
    /**
     * Remove callback for selection changes
     * @param {Function} callback - Function to remove
     */
    offSelectionChange(callback) {
      const index = this.onSelectionChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.onSelectionChangeCallbacks.splice(index, 1);
      }
    }
  
    /**
     * Notify all callbacks of selection change
     * @private
     */
    notifySelectionChange() {
      const data = {
        count: this.getSelectionCount(),
        isSelectionMode: this.isSelectionMode,
        selectedUrls: this.getSelectedUrls()
      };
  
      this.onSelectionChangeCallbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in selection change callback:', error);
        }
      });
    }
  }
  
  window.ImageSelectionManager = ImageSelectionManager;
/**
 * DuplicateResolver - Handles duplicate detection and resolution UI
 */
class DuplicateResolver {
    constructor(uiManager, databaseManager) {
      this.uiManager = uiManager;
      this.databaseManager = databaseManager;
      this.currentVideoData = null;
      this.existingVideoData = null;
      this.currentImageData = null;
      this.duplicateImages = [];
      this.onVideoResolveCallback = null;
      this.onImageResolveCallback = null;
      
      this.setupEventListeners();
    }
  
    /**
     * Setup event listeners for duplicate resolution modals
     */
    setupEventListeners() {
      this.setupVideoModalEvents();
      this.setupImageModalEvents();
      this.setupCustomMergeEvents();
    }
  
    /**
     * Check for video duplicates and handle resolution
     * @param {Object} videoData - New video data
     * @param {Function} onResolve - Callback when resolution is complete
     * @returns {Promise<void>}
     */
    async checkAndResolveVideoDuplicate(videoData, onResolve) {
      this.currentVideoData = videoData;
      this.onVideoResolveCallback = onResolve;
  
      // Check for existing video
      const existingVideo = await this.databaseManager.checkVideoDuplicate(videoData.url);
  
      if (existingVideo) {
        this.existingVideoData = existingVideo;
        this.showVideoDuplicateModal();
      } else {
        // No duplicate, save directly
        const result = await this.databaseManager.saveVideo(videoData, false);
        if (onResolve) onResolve(result);
      }
    }
  
    /**
     * Check for image duplicates and handle resolution
     * @param {Object} imageData - New image data
     * @param {Function} onResolve - Callback when resolution is complete
     * @returns {Promise<void>}
     */
    async checkAndResolveImageDuplicates(imageData, onResolve) {
      this.currentImageData = imageData;
      this.onImageResolveCallback = onResolve;
  
      // Check for existing images
      const duplicates = await this.databaseManager.checkImageDuplicates(imageData.urls, imageData.sourceUrl);
  
      if (duplicates.length > 0) {
        this.duplicateImages = duplicates;
        this.showImageDuplicateModal();
      } else {
        // No duplicates, save directly
        const result = await this.databaseManager.saveImages(imageData);
        if (onResolve) onResolve(result);
      }
    }
  
    /**
     * Show video duplicate resolution modal
     * @private
     */
    showVideoDuplicateModal() {
      const modal = document.getElementById('videoDuplicateModal');
      
      // Populate existing video data
      this.populateVideoData('existing', this.existingVideoData);
      
      // Populate new video data
      this.populateVideoData('new', this.currentVideoData);
      
      // Set current timestamp for new data
      document.getElementById('newScrapedAt').value = new Date().toLocaleString();
  
      modal.style.display = 'block';
    }
  
    /**
     * Show image duplicate resolution modal
     * @private
     */
    showImageDuplicateModal() {
      const modal = document.getElementById('imageDuplicateModal');
      const duplicatesList = document.getElementById('duplicateImagesList');
      
      // Update counts
      document.getElementById('duplicateImageCount').textContent = this.duplicateImages.length;
      document.getElementById('totalImageCount').textContent = this.currentImageData.urls.length;
      
      // Set form values
      document.getElementById('newImageTag').value = this.currentImageData.tag || '';
      document.getElementById('newImageComments').value = this.currentImageData.comments || '';
      
      // Clear and populate duplicates list
      duplicatesList.innerHTML = '';
      
      this.duplicateImages.forEach((duplicate, index) => {
        const item = this.createDuplicateImageItem(duplicate, index);
        duplicatesList.appendChild(item);
      });
  
      modal.style.display = 'block';
    }
  
    /**
     * Create duplicate image item element
     * @param {Object} duplicate - Duplicate image data
     * @param {number} index - Item index
     * @returns {HTMLElement} - Duplicate item element
     * @private
     */
    createDuplicateImageItem(duplicate, index) {
      const item = document.createElement('div');
      item.className = 'duplicate-image-item';
      item.innerHTML = `
        <img src="${duplicate.url}" alt="Duplicate image" class="duplicate-image-preview" 
             onerror="this.style.display='none';">
        <div class="duplicate-image-info">
          <div class="duplicate-image-field">
            <span class="duplicate-image-label">Tag:</span>
            <span class="duplicate-image-value">${duplicate.tag}</span>
          </div>
          <div class="duplicate-image-field">
            <span class="duplicate-image-label">Comments:</span>
            <span class="duplicate-image-value">${duplicate.comments || 'None'}</span>
          </div>
          <div class="duplicate-image-field">
            <span class="duplicate-image-label">Saved:</span>
            <span class="duplicate-image-value">${new Date(duplicate.saved_at).toLocaleDateString()}</span>
          </div>
          <div class="duplicate-image-field">
            <span class="duplicate-image-label">URL:</span>
            <span class="duplicate-image-value" style="font-size: 0.8rem; opacity: 0.7;">
              ${this.truncateUrl(duplicate.url)}
            </span>
          </div>
        </div>
      `;
      return item;
    }
  
    /**
     * Populate video data in modal
     * @param {string} prefix - 'existing' or 'new'
     * @param {Object} data - Video data
     * @private
     */
    populateVideoData(prefix, data) {
      document.getElementById(`${prefix}Title`).value = data.title || '';
      document.getElementById(`${prefix}Views`).value = data.views ? data.views.toLocaleString() : '';
      document.getElementById(`${prefix}Brand`).value = data.brand || '';
      document.getElementById(`${prefix}Playlist`).value = data.playlist || '';
      document.getElementById(`${prefix}ReleaseDate`).value = data.release_date || data.releaseDate || '';
      
      if (prefix === 'existing') {
        document.getElementById('existingCreatedAt').value = new Date(data.created_at).toLocaleString();
      }
  
      // Handle plot
      const plotField = document.getElementById(`${prefix}Plot`);
      if (plotField) {
        plotField.value = data.plot || '';
      }
  
      // Handle tags
      const tagsContainer = document.getElementById(`${prefix}TagsContainer`);
      tagsContainer.innerHTML = '';
      
      let tags = [];
      if (typeof data.tags === 'string') {
        try {
          tags = JSON.parse(data.tags);
        } catch (e) {
          tags = [];
        }
      } else if (Array.isArray(data.tags)) {
        tags = data.tags;
      }
  
      tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
    }
  
    /**
     * Setup video modal event listeners
     * @private
     */
    setupVideoModalEvents() {
      const modal = document.getElementById('videoDuplicateModal');
      const closeBtn = document.getElementById('closeVideoDuplicateModal');
      const keepExistingBtn = document.getElementById('keepExistingBtn');
      const updateWithNewBtn = document.getElementById('updateWithNewBtn');
      const customMergeBtn = document.getElementById('customMergeBtn');
      const cancelBtn = document.getElementById('cancelDuplicateBtn');
  
      // Close modal
      closeBtn.addEventListener('click', () => this.hideVideoDuplicateModal());
      cancelBtn.addEventListener('click', () => this.hideVideoDuplicateModal());
  
      // Keep existing
      keepExistingBtn.addEventListener('click', () => {
        this.hideVideoDuplicateModal();
        this.uiManager.showSnackbar('Kept existing video - no changes made');
        if (this.onVideoResolveCallback) {
          this.onVideoResolveCallback({ success: true, action: 'kept_existing' });
        }
      });
  
      // Update with new
      updateWithNewBtn.addEventListener('click', async () => {
        this.hideVideoDuplicateModal();
        this.uiManager.showSnackbar('Updating video with new data...');
        
        const result = await this.databaseManager.saveVideo(this.currentVideoData, true);
        this.uiManager.showSnackbar(result.success ? 'Video updated successfully!' : 'Failed to update video');
        
        if (this.onVideoResolveCallback) {
          this.onVideoResolveCallback(result);
        }
      });
  
      // Custom merge
      customMergeBtn.addEventListener('click', () => {
        this.hideVideoDuplicateModal();
        this.showCustomMergeModal();
      });
  
      // Close on outside click
      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          this.hideVideoDuplicateModal();
        }
      });
    }
  
    /**
     * Setup image modal event listeners
     * @private
     */
    setupImageModalEvents() {
      const modal = document.getElementById('imageDuplicateModal');
      const closeBtn = document.getElementById('closeImageDuplicateModal');
      const saveNewOnlyBtn = document.getElementById('saveNewImagesOnlyBtn');
      const saveAllBtn = document.getElementById('saveAllImagesBtn');
      const cancelBtn = document.getElementById('cancelImageDuplicateBtn');
  
      // Close modal
      closeBtn.addEventListener('click', () => this.hideImageDuplicateModal());
      cancelBtn.addEventListener('click', () => this.hideImageDuplicateModal());
  
      // Save new images only
      saveNewOnlyBtn.addEventListener('click', () => this.handleSaveNewImagesOnly());
  
      // Save all images
      saveAllBtn.addEventListener('click', () => this.handleSaveAllImages());
  
      // Close on outside click
      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          this.hideImageDuplicateModal();
        }
      });
    }
  
    /**
     * Setup custom merge modal events
     * @private
     */
    setupCustomMergeEvents() {
      const modal = document.getElementById('customMergeModal');
      const closeBtn = document.getElementById('closeCustomMergeModal');
      const saveMergedBtn = document.getElementById('saveMergedBtn');
      const cancelBtn = document.getElementById('cancelMergeBtn');
  
      closeBtn.addEventListener('click', () => this.hideCustomMergeModal());
      cancelBtn.addEventListener('click', () => this.hideCustomMergeModal());
      saveMergedBtn.addEventListener('click', () => this.handleSaveMerged());
  
      // Close on outside click
      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          this.hideCustomMergeModal();
        }
      });
    }
  
    /**
     * Show custom merge modal
     * @private
     */
    showCustomMergeModal() {
      // Populate merge fields
      document.getElementById('merge_title_existing').value = this.existingVideoData.title || '';
      document.getElementById('merge_title_new').value = this.currentVideoData.title || '';
      
      document.getElementById('merge_views_existing').value = this.existingVideoData.views ? this.existingVideoData.views.toLocaleString() : '';
      document.getElementById('merge_views_new').value = this.currentVideoData.views ? this.currentVideoData.views.toLocaleString() : '';
      
      document.getElementById('merge_playlist_existing').value = this.existingVideoData.playlist || '';
      document.getElementById('merge_playlist_new').value = this.currentVideoData.playlist || '';
      
      document.getElementById('merge_plot_existing').value = this.existingVideoData.plot || '';
      document.getElementById('merge_plot_new').value = this.currentVideoData.plot || '';
  
      // Set default selections (prefer new data)
      document.getElementById('title_new').checked = true;
      document.getElementById('views_new').checked = true;
      document.getElementById('playlist_new').checked = true;
      document.getElementById('plot_new').checked = true;
  
      document.getElementById('customMergeModal').style.display = 'block';
    }
  
    /**
     * Handle save merged data
     * @private
     */
    async handleSaveMerged() {
      const mergedData = { ...this.currentVideoData };
  
      // Get selected values
      if (document.getElementById('title_existing').checked) {
        mergedData.title = this.existingVideoData.title;
      }
      if (document.getElementById('views_existing').checked) {
        mergedData.views = this.existingVideoData.views;
      }
      if (document.getElementById('playlist_existing').checked) {
        mergedData.playlist = this.existingVideoData.playlist;
      }
      if (document.getElementById('plot_existing').checked) {
        mergedData.plot = this.existingVideoData.plot;
      }
  
      this.hideCustomMergeModal();
      this.uiManager.showSnackbar('Saving merged data...');
  
      const result = await this.databaseManager.saveVideo(mergedData, true);
      this.uiManager.showSnackbar(result.success ? 'Merged data saved successfully!' : 'Failed to save merged data');
  
      if (this.onVideoResolveCallback) {
        this.onVideoResolveCallback(result);
      }
    }
  
    /**
     * Handle save new images only
     * @private
     */
    async handleSaveNewImagesOnly() {
      const tag = document.getElementById('newImageTag').value.trim();
      const comments = document.getElementById('newImageComments').value.trim();
  
      if (!tag) {
        this.uiManager.showSnackbar('Tag is required!');
        return;
      }
  
      // Filter out duplicate URLs
      const duplicateUrls = new Set(this.duplicateImages.map(img => img.url));
      const newUrls = this.currentImageData.urls.filter(url => !duplicateUrls.has(url));
  
      if (newUrls.length === 0) {
        this.uiManager.showSnackbar('No new images to save!');
        return;
      }
  
      const imageData = {
        ...this.currentImageData,
        urls: newUrls,
        tag,
        comments
      };
  
      this.hideImageDuplicateModal();
      this.uiManager.showSnackbar('Saving new images...');
  
      const result = await this.databaseManager.saveImages(imageData);
      const message = result.success ? 
        `Saved ${result.saved} new images (${this.duplicateImages.length} duplicates skipped)` :
        'Failed to save images';
      
      this.uiManager.showSnackbar(message);
  
      if (this.onImageResolveCallback) {
        this.onImageResolveCallback(result);
      }
    }
  
    /**
     * Handle save all images
     * @private
     */
    async handleSaveAllImages() {
      const tag = document.getElementById('newImageTag').value.trim();
      const comments = document.getElementById('newImageComments').value.trim();
  
      if (!tag) {
        this.uiManager.showSnackbar('Tag is required!');
        return;
      }
  
      const imageData = {
        ...this.currentImageData,
        tag,
        comments
      };
  
      this.hideImageDuplicateModal();
      this.uiManager.showSnackbar('Saving all images...');
  
      const result = await this.databaseManager.saveImages(imageData);
      const message = result.success ? 
        `Saved ${result.saved} images (${result.skipped} duplicates updated)` :
        'Failed to save images';
      
      this.uiManager.showSnackbar(message);
  
      if (this.onImageResolveCallback) {
        this.onImageResolveCallback(result);
      }
    }
  
    /**
     * Hide video duplicate modal
     * @private
     */
    hideVideoDuplicateModal() {
      document.getElementById('videoDuplicateModal').style.display = 'none';
    }
  
    /**
     * Hide image duplicate modal
     * @private
     */
    hideImageDuplicateModal() {
      document.getElementById('imageDuplicateModal').style.display = 'none';
    }
  
    /**
     * Hide custom merge modal
     * @private
     */
    hideCustomMergeModal() {
      document.getElementById('customMergeModal').style.display = 'none';
    }
  
    /**
     * Truncate URL for display
     * @param {string} url - URL to truncate
     * @returns {string} - Truncated URL
     * @private
     */
    truncateUrl(url) {
      if (!url) return '';
      return url.length > 50 ? url.substring(0, 47) + '...' : url;
    }
  
    /**
     * Cleanup resources
     */
    destroy() {
      this.currentVideoData = null;
      this.existingVideoData = null;
      this.currentImageData = null;
      this.duplicateImages = [];
      this.onVideoResolveCallback = null;
      this.onImageResolveCallback = null;
    }
  }
  
  window.DuplicateResolver = DuplicateResolver;
class UIManager {
  constructor() {
    this.snackbar = document.getElementById('snackbar');
    this.snackbarTimeout = null;
    this.fabCounter = null;
  }

  showSnackbar(message, duration = 1500) {
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }

    this.snackbar.textContent = message;
    this.snackbar.classList.add('show');

    this.snackbarTimeout = setTimeout(() => {
      this.snackbar.classList.remove('show');
      this.snackbarTimeout = null;
    }, duration);
  }

  /**
   * Show database configuration error with enhanced styling
   * @param {string} action - The action that failed (e.g., "saving video", "saving images")
   */
  showDatabaseConfigError(action = 'saving') {
    const message = `⚠️ Database not configured! Please set up your database path in Settings before ${action}.`;
    this.showSnackbar(message, 4000);
    
    // Add a subtle error styling to the snackbar
    this.snackbar.style.backgroundColor = '#f44336';
    this.snackbar.style.borderLeft = '4px solid #d32f2f';
    
    // Reset styling after the message disappears
    setTimeout(() => {
      this.snackbar.style.backgroundColor = '#333';
      this.snackbar.style.borderLeft = 'none';
    }, 4000);
  }

  hideSnackbar() {
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
      this.snackbarTimeout = null;
    }
    this.snackbar.classList.remove('show');
  }

  /**
   * Populate playlist dropdown with existing playlists from database
   * @param {string[]} playlists - Array of playlist names from database
   */
  populatePlaylistDropdown(playlists = []) {
    const datalist = document.getElementById('playlistDatalist');
    if (!datalist) return;

    // Clear existing options
    datalist.innerHTML = '';

    // Add playlists from database
    playlists.forEach(playlist => {
      const option = document.createElement('option');
      option.value = playlist;
      datalist.appendChild(option);
    });

    console.log('Playlist dropdown populated with', playlists.length, 'items');
  }

  async showModal(data) {
    const modal = document.getElementById('dataModal');
    const titleField = document.getElementById('titleField');
    const viewsField = document.getElementById('viewsField');
    const urlField = document.getElementById('urlField');
    const thumbnailField = document.getElementById('thumbnailField');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    const brandField = document.getElementById('brandField');
    const playlistField = document.getElementById('playlistField');
    const releaseDateField = document.getElementById('releaseDateField');
    const tagsContainer = document.getElementById('tagsContainer');
    const plotField = document.getElementById('plotField');

    // Populate basic fields
    titleField.value = data.title || '';
    viewsField.value = data.views !== null ? data.views.toLocaleString() : '';
    urlField.value = data.url || '';
    thumbnailField.value = data.thumbnail || '';
    
    if (data.thumbnail) {
      thumbnailPreview.src = data.thumbnail;
      thumbnailPreview.style.display = 'block';
    } else {
      thumbnailPreview.style.display = 'none';
    }
    
    brandField.value = data.brand || '';
    releaseDateField.value = data.releaseDate || '';
    plotField.value = data.plot || '';

    // Handle playlist field
    if (playlistField) {
      playlistField.value = data.playlist || '';
      
      // Populate playlist dropdown from database
      try {
        // This will be called by the app controller which has access to settings/database
        await this.loadPlaylistsFromDatabase();
      } catch (error) {
        console.log('No database access for playlists:', error);
        // Gracefully handle when database is not available
      }
    }

    // Handle tags
    tagsContainer.innerHTML = '';
    if (data.tags && data.tags.length > 0) {
      data.tags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.textContent = tag;
        tagsContainer.appendChild(tagElement);
      });
    }

    modal.style.display = 'block';
  }

  /**
   * Load playlists from database - will be overridden by app controller
   * @returns {Promise<void>}
   */
  async loadPlaylistsFromDatabase() {
    // Default implementation - will be overridden
    this.populatePlaylistDropdown([]);
  }

  /**
   * Capitalize playlist value before saving
   * @param {string} value - The playlist value to capitalize
   * @returns {string} - Capitalized playlist name
   */
  capitalizePlaylist(value) {
    if (!value || typeof value !== 'string') return '';
    
    return value
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  hideModal() {
    const modal = document.getElementById('dataModal');
    modal.style.display = 'none';
  }

  showImageSaveModal(imageCount) {
    const modal = document.getElementById('imageSaveModal');
    const imageCountDisplay = document.getElementById('imageCountDisplay');
    const tagField = document.getElementById('imageTagField');
    const commentsField = document.getElementById('imageCommentsField');

    // Update image count
    imageCountDisplay.textContent = imageCount;

    // Clear previous values
    tagField.value = '';
    commentsField.value = '';

    // Focus on tag field
    setTimeout(() => {
      tagField.focus();
    }, 100);

    modal.style.display = 'block';
  }

  hideImageSaveModal() {
    const modal = document.getElementById('imageSaveModal');
    modal.style.display = 'none';
  }

  setupModalEvents(onSave, onCancel) {
    const modal = document.getElementById('dataModal');
    const closeModal = document.getElementById('closeModal');
    const cancelButton = document.getElementById('cancelButton');
    const saveButton = document.getElementById('saveButton');

    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.hideModal();
      }
    });

    closeModal.addEventListener('click', () => this.hideModal());
    cancelButton.addEventListener('click', () => {
      this.hideModal();
      if (onCancel) onCancel();
    });

    saveButton.addEventListener('click', () => {
      const plotField = document.getElementById('plotField');
      const playlistField = document.getElementById('playlistField');
      
      // Get and capitalize playlist value
      const playlistValue = this.capitalizePlaylist(playlistField ? playlistField.value : '');
      
      if (onSave) onSave(plotField.value, playlistValue);
      this.hideModal();
    });
  }

  setupImageSaveModalEvents(onSave, onCancel) {
    const modal = document.getElementById('imageSaveModal');
    const closeModal = document.getElementById('closeImageModal');
    const cancelButton = document.getElementById('cancelImageButton');
    const saveButton = document.getElementById('saveImageButton');
    const tagField = document.getElementById('imageTagField');
    const commentsField = document.getElementById('imageCommentsField');

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        this.hideImageSaveModal();
      }
    });

    // Close button
    closeModal.addEventListener('click', () => {
      this.hideImageSaveModal();
      if (onCancel) onCancel();
    });

    // Cancel button
    cancelButton.addEventListener('click', () => {
      this.hideImageSaveModal();
      if (onCancel) onCancel();
    });

    // Save button
    saveButton.addEventListener('click', () => {
      const tag = tagField.value.trim();
      const comments = commentsField.value.trim();

      if (!tag) {
        tagField.focus();
        tagField.style.borderColor = '#f44336';
        this.showSnackbar('Tag is required!');
        return;
      }

      if (onSave) {
        onSave(tag, comments);
        this.hideImageSaveModal();
      }
    });

    // Enter key to save (when tag field is focused)
    tagField.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        saveButton.click();
      }
    });

    // Reset border color when typing
    tagField.addEventListener('input', () => {
      tagField.style.borderColor = '';
    });
  }

  updateFABCounter(count) {
    const fab = this.getFAB();
    if (!fab) return;

    // Create counter badge if it doesn't exist
    if (!this.fabCounter) {
      this.fabCounter = document.createElement('div');
      this.fabCounter.className = 'fab-counter';
      fab.appendChild(this.fabCounter);
    }

    // Update counter text and visibility
    if (count > 0) {
      this.fabCounter.textContent = count;
      this.fabCounter.classList.remove('hidden');
    } else {
      this.fabCounter.classList.add('hidden');
    }
  }

  clearFABCounter() {
    if (this.fabCounter) {
      this.fabCounter.classList.add('hidden');
    }
  }

  getFAB() {
    return document.getElementById('fab');
  }

  getWebview() {
    return document.getElementById('webview');
  }
}

window.UIManager = UIManager;
class AppController {
  constructor() {
    this.uiManager = new UIManager();
    this.scraper = new MediaScraper();
    this.webview = null;
    this.fab = null;
    this.currentData = null;
    this.imageSelectionMode = false;
    this.selectedImageUrls = [];
    
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
      this.autoCloseAds();
    });

    this.webview.addEventListener('did-navigate', () => {
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
    this.uiManager.setupModalEvents(
      (plotValue) => this.handleSave(plotValue),
      () => this.handleCancel()
    );
    
    // Setup image save modal events - THIS WAS MISSING!
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
    // Check if we're already in selection mode
    if (this.imageSelectionMode) {
        // Second FAB click - process selected images
        this.processSelectedImages();
    } else {
        // First FAB click - enter selection mode
        this.enterImageSelectionMode();
    }
  }

async injectImageClickHandler() {
    try {
        await this.webview.executeJavaScript(`
            // Image click handler for gallery page
            (function() {
                console.log('Image click handler loaded');
                
                // Store selected image URLs
                window.selectedImageUrls = window.selectedImageUrls || new Set();
                
                // Function to extract full image URL from thumbnail
                function getFullImageUrl(thumbnailSrc, anchorHref) {
                    // If we have the anchor href (full image URL), use that
                    if (anchorHref && anchorHref.startsWith('https://cu-images.')) {
                        return anchorHref;
                    }
                    
                    // Fallback: try to construct from thumbnail
                    if (thumbnailSrc && thumbnailSrc.includes('_200.')) {
                        // Remove _200 suffix to get full image
                        return thumbnailSrc.replace('_200.', '.');
                    }
                    
                    return thumbnailSrc; // fallback to original
                }
                
                // Function to add visual selection indicator
                function addSelectionIndicator(linkElement) {
                    // Create selection overlay
                    const selectionDiv = document.createElement('div');
                    selectionDiv.className = 'selection-indicator';
                    selectionDiv.innerHTML = \`
                        <div class="selection-overlay"></div>
                        <div class="selection-checkmark">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="10" fill="white" stroke="#2196F3" stroke-width="2"/>
                                <path d="M8 12l2 2 4-4" stroke="#2196F3" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    \`;
                    
                    // Add CSS styles
                    selectionDiv.style.cssText = \`
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        pointer-events: none !important;
                        z-index: 10 !important;
                    \`;
                    
                    // Style the overlay
                    const overlay = selectionDiv.querySelector('.selection-overlay');
                    overlay.style.cssText = \`
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        background-color: rgba(33, 150, 243, 0.3) !important;
                        border: 3px solid #2196F3 !important;
                        border-radius: 8px !important;
                        box-sizing: border-box !important;
                    \`;
                    
                    // Style the checkmark
                    const checkmark = selectionDiv.querySelector('.selection-checkmark');
                    checkmark.style.cssText = \`
                        position: absolute !important;
                        top: 8px !important;
                        right: 8px !important;
                        background-color: rgba(255, 255, 255, 0.9) !important;
                        border-radius: 50% !important;
                        padding: 2px !important;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    \`;
                    
                    // Make sure the parent link has relative positioning
                    linkElement.style.position = 'relative';
                    
                    // Add the selection indicator
                    linkElement.appendChild(selectionDiv);
                    
                    console.log('Selection indicator added to image');
                }
                
                // Function to remove selection indicator
                function removeSelectionIndicator(linkElement) {
                    const existingIndicator = linkElement.querySelector('.selection-indicator');
                    if (existingIndicator) {
                        existingIndicator.remove();
                        console.log('Selection indicator removed from image');
                    }
                }
                
                // Function to check if image is selected
                function isImageSelected(imageUrl) {
                    return window.selectedImageUrls.has(imageUrl);
                }
                
                // Add click event listener to all gallery images
                function addImageClickHandlers() {
                    // Target the image container links
                    const imageLinks = document.querySelectorAll('.cuc_container .cuc');
                    
                    console.log(\`Found \${imageLinks.length} gallery images\`);
                    
                    imageLinks.forEach((link, index) => {
                        // Check if already has our handler
                        if (link.dataset.clickHandlerAdded) return;
                        
                        // Add click event listener
                        link.addEventListener('click', handleImageClick);
                        link.dataset.clickHandlerAdded = 'true';
                    });
                }
                
                // Handle image click
                function handleImageClick(event) {
                    event.preventDefault(); // Prevent default link behavior
                    event.stopPropagation();
                    
                    const link = event.currentTarget;
                    const img = link.querySelector('.cuc__content');
                    
                    if (!img) {
                        console.log('No image found in clicked element');
                        return;
                    }
                    
                    const thumbnailSrc = img.src;
                    const fullImageUrl = getFullImageUrl(thumbnailSrc, link.href);
                    
                    console.log('Image clicked:', fullImageUrl);
                    
                    // Toggle selection
                    if (isImageSelected(fullImageUrl)) {
                        // Unselect image
                        window.selectedImageUrls.delete(fullImageUrl);
                        removeSelectionIndicator(link);
                        console.log('Image unselected. Total selected:', window.selectedImageUrls.size);
                    } else {
                        // Select image
                        window.selectedImageUrls.add(fullImageUrl);
                        addSelectionIndicator(link);
                        console.log('Image selected. Total selected:', window.selectedImageUrls.size);
                    }
                }
                
                // Function to get all selected URLs (for external access)
                window.getSelectedImageUrls = function() {
                    return Array.from(window.selectedImageUrls);
                };
                
                // Function to clear all selections (for external access)
                window.clearSelectedImages = function() {
                    // Remove all visual indicators
                    document.querySelectorAll('.selection-indicator').forEach(indicator => {
                        indicator.remove();
                    });
                    
                    // Clear the URLs set
                    window.selectedImageUrls.clear();
                    console.log('All image selections cleared');
                };
                
                // Initialize
                addImageClickHandlers();
                
                // Also run after a short delay to catch dynamically loaded content
                setTimeout(addImageClickHandlers, 1000);
                
                console.log('Image click handler setup complete');
            })();
        `);
        
        console.log('Image click handler injected successfully');
    } catch (error) {
        console.error('Failed to inject image click handler:', error);
    }
}

  enterImageSelectionMode() {
    this.imageSelectionMode = true;
    this.selectedImageUrls = [];
    
    this.uiManager.showSnackbar('Please select the images and click the button again');
    
    // Inject the image click handler script
    this.injectImageClickHandler();
    
    // Start updating FAB counter - THIS WAS MISSING!
    this.startFABCounterUpdates();
  }

  async processSelectedImages() {
    try {
        // Get selected URLs from the webview
        const selectedUrls = await this.webview.executeJavaScript(`
            window.getSelectedImageUrls ? window.getSelectedImageUrls() : [];
        `);
        
        if (selectedUrls && selectedUrls.length > 0) {
            this.selectedImageUrls = selectedUrls;
            
            // Show the image save modal instead of snackbar - THIS WAS MISSING!
            this.uiManager.showImageSaveModal(selectedUrls.length);
        } else {
            this.uiManager.showSnackbar('No images selected. Please select some images first.');
        }
    } catch (error) {
        console.error('Error processing selected images:', error);
        this.uiManager.showSnackbar('Error processing selected images');
    }
  }

  async clearImageSelections() {
    try {
        // Clear selections in the webview
        await this.webview.executeJavaScript(`
            if (window.clearSelectedImages) {
                window.clearSelectedImages();
            }
        `);
        
        // Reset state
        this.imageSelectionMode = false;
        this.selectedImageUrls = [];
        
        // Clear FAB counter and stop updates - THIS WAS MISSING!
        this.stopFABCounterUpdates();
        this.uiManager.clearFABCounter();
        
        console.log('Image selections cleared');
    } catch (error) {
        console.error('Error clearing image selections:', error);
    }
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

  // THESE METHODS WERE COMPLETELY MISSING:

  startFABCounterUpdates() {
    // Update counter every 500ms while in selection mode
    this.fabCounterInterval = setInterval(async () => {
      if (this.imageSelectionMode) {
        try {
          const count = await this.webview.executeJavaScript(`
            window.selectedImageUrls ? window.selectedImageUrls.size : 0;
          `);
          this.uiManager.updateFABCounter(count);
        } catch (error) {
          console.error('Error updating FAB counter:', error);
        }
      }
    }, 500);
  }

  stopFABCounterUpdates() {
    if (this.fabCounterInterval) {
      clearInterval(this.fabCounterInterval);
      this.fabCounterInterval = null;
    }
  }

  async handleImageSave(tag, comments) {
    try {
      // Validate required fields
      if (!tag || tag.trim() === '') {
        this.uiManager.showSnackbar('Tag is required!');
        return;
      }

      const imageData = {
        urls: this.selectedImageUrls,
        tag: tag.trim(),
        comments: comments ? comments.trim() : '',
        savedAt: new Date().toISOString()
      };

      // Here you can add the actual database saving logic
      console.log('Saving images with data:', imageData);
      
      this.uiManager.showSnackbar(`Successfully saved ${this.selectedImageUrls.length} images with tag "${tag}"!`);
      
      // Clear selections and exit selection mode
      await this.clearImageSelections();
      
    } catch (error) {
      console.error('Error saving images:', error);
      this.uiManager.showSnackbar('Error saving images to library');
    }
  }

  handleImageCancel() {
    // Just close the modal, keep selections
    console.log('Image save cancelled');
  }
}

window.AppController = AppController;
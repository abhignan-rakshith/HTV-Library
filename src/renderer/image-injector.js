/**
 * ImageInjector - Handles DOM injection and manipulation for image selection
 */
class ImageInjector {
    constructor() {
      this.injectedScript = null;
    }
  
    /**
     * Inject image click handler into webview
     * @param {Electron.WebviewTag} webview - The webview element
     * @returns {Promise<boolean>} - Success status
     */
    async injectClickHandler(webview) {
      try {
        await webview.executeJavaScript(this.getClickHandlerScript());
        this.injectedScript = true;
        return true;
      } catch (error) {
        console.error('Failed to inject image click handler:', error);
        return false;
      }
    }
  
    /**
     * Get selected image URLs from webview
     * @param {Electron.WebviewTag} webview - The webview element
     * @returns {Promise<string[]>} - Array of selected URLs
     */
    async getSelectedUrls(webview) {
      try {
        const urls = await webview.executeJavaScript(`
          window.getSelectedImageUrls ? window.getSelectedImageUrls() : [];
        `);
        return urls || [];
      } catch (error) {
        console.error('Error getting selected URLs:', error);
        return [];
      }
    }
  
    /**
     * Clear all selections in webview
     * @param {Electron.WebviewTag} webview - The webview element
     * @returns {Promise<boolean>} - Success status
     */
    async clearSelections(webview) {
      try {
        await webview.executeJavaScript(`
          if (window.clearSelectedImages) {
            window.clearSelectedImages();
          }
        `);
        return true;
      } catch (error) {
        console.error('Error clearing selections:', error);
        return false;
      }
    }
  
    /**
     * Get the selection count from webview
     * @param {Electron.WebviewTag} webview - The webview element
     * @returns {Promise<number>} - Number of selected images
     */
    async getSelectionCount(webview) {
      try {
        const count = await webview.executeJavaScript(`
          window.selectedImageUrls ? window.selectedImageUrls.size : 0;
        `);
        return count || 0;
      } catch (error) {
        console.error('Error getting selection count:', error);
        return 0;
      }
    }
  
    /**
     * Generate the click handler script for injection
     * @returns {string} - The script to inject
     * @private
     */
    getClickHandlerScript() {
      return `
        (function() {
          // Prevent multiple injections
          if (window.imageClickHandlerInjected) {
            return;
          }
          window.imageClickHandlerInjected = true;
  
          console.log('Image click handler loading...');
          
          // Initialize selection state
          window.selectedImageUrls = window.selectedImageUrls || new Set();
          
          // Utility functions
          const ImageUtils = {
            getFullImageUrl(thumbnailSrc, anchorHref) {
              if (anchorHref && anchorHref.startsWith('https://cu-images.')) {
                return anchorHref;
              }
              
              if (thumbnailSrc && thumbnailSrc.includes('_200.')) {
                return thumbnailSrc.replace('_200.', '.');
              }
              
              return thumbnailSrc;
            },
  
            isImageSelected(imageUrl) {
              return window.selectedImageUrls.has(imageUrl);
            }
          };
  
          // Visual indicator management
          const VisualIndicator = {
            create() {
              const indicator = document.createElement('div');
              indicator.className = 'htv-selection-indicator';
              indicator.innerHTML = \`
                <div class="htv-selection-overlay"></div>
                <div class="htv-selection-checkmark">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="white" stroke="#2196F3" stroke-width="2"/>
                    <path d="M8 12l2 2 4-4" stroke="#2196F3" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
              \`;
              
              this.applyStyles(indicator);
              return indicator;
            },
  
            applyStyles(indicator) {
              indicator.style.cssText = \`
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                pointer-events: none !important;
                z-index: 10 !important;
              \`;
              
              const overlay = indicator.querySelector('.htv-selection-overlay');
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
              
              const checkmark = indicator.querySelector('.htv-selection-checkmark');
              checkmark.style.cssText = \`
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                background-color: rgba(255, 255, 255, 0.9) !important;
                border-radius: 50% !important;
                padding: 2px !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
              \`;
            },
  
            add(linkElement) {
              linkElement.style.position = 'relative';
              const indicator = this.create();
              linkElement.appendChild(indicator);
            },
  
            remove(linkElement) {
              const indicator = linkElement.querySelector('.htv-selection-indicator');
              if (indicator) {
                indicator.remove();
              }
            }
          };
  
          // Click handler management
          const ClickHandler = {
            init() {
              this.attachHandlers();
              // Re-attach after potential DOM updates
              setTimeout(() => this.attachHandlers(), 1000);
            },
  
            attachHandlers() {
              const imageLinks = document.querySelectorAll('.cuc_container .cuc');
              console.log(\`Found \${imageLinks.length} gallery images\`);
              
              imageLinks.forEach(link => {
                if (!link.dataset.htvHandlerAdded) {
                  link.addEventListener('click', this.handleClick.bind(this));
                  link.dataset.htvHandlerAdded = 'true';
                }
              });
            },
  
            handleClick(event) {
              event.preventDefault();
              event.stopPropagation();
              
              const link = event.currentTarget;
              const img = link.querySelector('.cuc__content');
              
              if (!img) return;
              
              const thumbnailSrc = img.src;
              const fullImageUrl = ImageUtils.getFullImageUrl(thumbnailSrc, link.href);
              
              if (ImageUtils.isImageSelected(fullImageUrl)) {
                window.selectedImageUrls.delete(fullImageUrl);
                VisualIndicator.remove(link);
              } else {
                window.selectedImageUrls.add(fullImageUrl);
                VisualIndicator.add(link);
              }
              
              console.log(\`Selection updated. Total: \${window.selectedImageUrls.size}\`);
            }
          };
  
          // Global API functions
          window.getSelectedImageUrls = function() {
            return Array.from(window.selectedImageUrls);
          };
          
          window.clearSelectedImages = function() {
            document.querySelectorAll('.htv-selection-indicator').forEach(indicator => {
              indicator.remove();
            });
            window.selectedImageUrls.clear();
            console.log('All selections cleared');
          };
          
          // Initialize
          ClickHandler.init();
          console.log('Image click handler setup complete');
        })();
      `;
    }
  }
  
  window.ImageInjector = ImageInjector;
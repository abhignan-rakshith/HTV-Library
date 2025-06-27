class MediaScraper {
  constructor() {
    this.selectors = {
      title: '.tv-title',
      views: '.tv-views',
      thumbnail: '.hvpi-cover',
      brand: '.hvpimbc-text[href*="/browse/brands/"]',
      metaItem: '.hvpimbc-item',
      metaHeader: '.hvpimbc-header',
      metaText: '.hvpimbc-text',
      tagLinks: '.hvpis-text a[href^="/browse/tags/"]',
      plot: '.hvpist-description'
    };
  }

  async scrapeVideoPage(webview) {
    try {
      const pageData = await webview.executeJavaScript(`
        (function() {
          const selectors = {
            title: '.tv-title',
            views: '.tv-views',
            thumbnail: '.hvpi-cover',
            brand: '.hvpimbc-text[href*="/browse/brands/"]',
            metaItem: '.hvpimbc-item',
            metaHeader: '.hvpimbc-header',
            metaText: '.hvpimbc-text',
            tagLinks: '.hvpis-text a[href^="/browse/tags/"]',
            plot: '.hvpist-description'
          };
          
          const title = document.querySelector(selectors.title);
          const views = document.querySelector(selectors.views);
          const thumbnail = document.querySelector(selectors.thumbnail);
          const brand = document.querySelector(selectors.brand);
          const plot = document.querySelector(selectors.plot);
          
          let releaseDate = null;
          document.querySelectorAll(selectors.metaItem).forEach(item => {
            const header = item.querySelector(selectors.metaHeader);
            if (header && header.textContent.includes('Release Date')) {
              releaseDate = item.querySelector(selectors.metaText);
            }
          });
          
          let currentUrl = window.location.href.split('?')[0];
          
          let tagTexts = [];
          try {
            const tagLinks = document.querySelectorAll(selectors.tagLinks);
            if (tagLinks.length > 0) {
              tagTexts = [...new Set(
                Array.from(tagLinks)
                  .slice(0, 10)
                  .map(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                      const tag = href.split('/browse/tags/')[1];
                      return decodeURIComponent(tag);
                    }
                    const content = link.querySelector('.btn__content');
                    return content ? content.textContent.trim() : null;
                  })
                  .filter(Boolean)
              )];
            }
          } catch (tagError) {
            console.error('Tag extraction error:', tagError);
            tagTexts = [];
          }
          
          let viewCount = null;
          if (views && views.textContent) {
            const cleanViews = views.textContent.trim().split(' ')[0].replace(/,/g, '');
            viewCount = parseInt(cleanViews, 10);
          }
          
          const data = {
            url: currentUrl,
            title: title?.textContent?.trim() || null,
            views: viewCount,
            thumbnail: thumbnail?.src || null,
            brand: brand?.textContent?.trim() || null,
            releaseDate: releaseDate?.textContent?.trim() || null,
            tags: tagTexts,
            plot: plot?.textContent?.trim() || null
          };
          
          const missingElements = [];
          Object.entries(data).forEach(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) {
              missingElements.push(key);
            }
          });
          
          return {
            success: missingElements.length === 0,
            missingElements,
            data
          };
        })()
      `);
      
      return pageData;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  isVideoPage(url) {
    return url.includes('/videos/hentai/');
  }

  isImagesPage(url) {
    return url.includes('/browse/images');
  }
}

window.MediaScraper = MediaScraper;
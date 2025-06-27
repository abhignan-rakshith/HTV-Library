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
      tagLinks: 'a[href^="/browse/tags/"]',
      plot: '.hvpist-description'
    };
  }

  async scrapeVideoPage(webview) {
    try {
      const pageData = await webview.executeJavaScript(`
        (function() {
          const selectors = ${JSON.stringify(this.selectors)};
          
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
          
          const tagLinks = Array.from(document.querySelectorAll(selectors.tagLinks));
          const tags = tagLinks
            .map(link => {
              const href = link.getAttribute('href');
              return href ? href.split('/browse/tags/')[1] : null;
            })
            .filter(Boolean);
          
          const data = {
            title: title?.textContent?.trim() || null,
            views: views?.textContent?.trim() || null,
            thumbnail: thumbnail?.src || null,
            brand: brand?.textContent?.trim() || null,
            releaseDate: releaseDate?.textContent?.trim() || null,
            tags: tags,
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
        })();
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
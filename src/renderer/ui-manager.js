class UIManager {
  constructor() {
    this.snackbar = document.getElementById('snackbar');
    this.snackbarTimeout = null;
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

  hideSnackbar() {
    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
      this.snackbarTimeout = null;
    }
    this.snackbar.classList.remove('show');
  }

  showModal(data) {
    const modal = document.getElementById('dataModal');
    const titleField = document.getElementById('titleField');
    const viewsField = document.getElementById('viewsField');
    const urlField = document.getElementById('urlField');
    const thumbnailField = document.getElementById('thumbnailField');
    const thumbnailPreview = document.getElementById('thumbnailPreview');
    const brandField = document.getElementById('brandField');
    const releaseDateField = document.getElementById('releaseDateField');
    const tagsContainer = document.getElementById('tagsContainer');
    const plotField = document.getElementById('plotField');

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

  hideModal() {
    const modal = document.getElementById('dataModal');
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
      if (onSave) onSave(plotField.value);
      this.hideModal();
    });
  }

  getFAB() {
    return document.getElementById('fab');
  }

  getWebview() {
    return document.getElementById('webview');
  }
}

window.UIManager = UIManager;
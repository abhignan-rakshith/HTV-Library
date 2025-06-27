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

  getFAB() {
    return document.getElementById('fab');
  }

  getWebview() {
    return document.getElementById('webview');
  }
}

window.UIManager = UIManager;
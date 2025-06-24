# HTV Library

A cross-platform desktop application built with Electron for managing and viewing content with built-in ad-blocking capabilities.

## Features

- Built-in ad-blocker using @cliqz/adblocker-electron
- Fullscreen support with easy controls:
  - F11: Toggle fullscreen
  - Escape: Exit fullscreen
  - Standard window controls always accessible via menu bar
- Cross-platform support (Windows, macOS, Linux)
- Secure implementation with:
  - Context isolation enabled
  - Node integration disabled
  - Proper IPC communication

## Development Setup

### Prerequisites

- Node.js (Latest LTS recommended)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd HTV-Library
```

2. Install dependencies:

```bash
npm install
```

### Running the Application

To start the application in development mode:

```bash
npm start
```

### Building

To create a production build:

```bash
npm run make
```

The built application will be available in the `out` directory.

## Project Structure

```
HTV-Library/
├── src/
│   ├── index.js        # Main process file
│   ├── preload.js      # Preload script for secure IPC
│   ├── index.html      # Main window HTML
│   └── index.css       # Styles
├── package.json
└── forge.config.js     # Electron Forge configuration
```

## Features in Development

- [ ] Content management system
- [ ] Library organization
- [ ] Search functionality
- [ ] Custom themes/styling

## Security

This application implements several security best practices:

- Uses contextIsolation for renderer process
- Implements secure IPC communication
- Disables nodeIntegration in renderer process
- Uses a preload script for exposed APIs
- Implements ad-blocking for safer browsing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[Add your chosen license here]

## Acknowledgments

- Electron
- @cliqz/adblocker-electron for ad-blocking functionality

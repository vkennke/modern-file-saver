# modern-file-saver

A modern file saving library for browsers that uses the File System Access API when available and falls back to the traditional download method when necessary.

## Features

- 🚀 Modern browser support with File System Access API
- 🔄 Automatic fallback for older browsers
- 💪 TypeScript support
- 🎯 Multiple input formats supported
- 📦 Zero dependencies
- 🔐 Safe file handling
- 🪶 Tiny size (~5kb)

## Installation

```bash
npm install modern-file-saver
```

## Usage

```typescript
import { saveFile } from 'modern-file-saver';

// Basic usage
await saveFile('Hello World', { fileName: 'hello.txt' });

// Save JSON
const data = { hello: 'world' };
await saveFile(JSON.stringify(data), {
    fileName: 'data.json',
    mimeType: 'application/json'
});

// Save from base64
await saveFile(base64String, {
    fileName: 'document.pdf',
    mimeType: 'application/pdf'
});

// Save from Blob
const blob = new Blob(['content'], { type: 'text/plain' });
await saveFile(blob, { fileName: 'file.txt' });
```

## Supported Input Types

- Strings (plain text, base64, data URLs)
- Blobs
- ArrayBuffer
- TypedArray (Uint8Array, etc.)
- URLSearchParams
- FormData

## Options

```typescript
interface SaveOptions {
    fileName?: string;      // Default: 'download'
    mimeType?: string;      // Default: based on input type
    promptSaveAs?: boolean; // Default: true, uses File System Access API when available
}
```

## Browser Support

- Modern browsers (Chrome, Edge): Uses File System Access API for native save dialog
- Other browsers (Firefox, Safari): Falls back to traditional download method
- Legacy browsers (IE): Not supported

### Limitations

- File System Access API is not available in iframes (will automatically fall back to legacy method)
- File System Access API requires a secure context (HTTPS)

## Feature Detection

The library automatically detects browser capabilities and chooses the best available method:

```typescript
// Will use File System Access API in supporting browsers
await saveFile(content, { promptSaveAs: true });

// Will always use traditional download method
await saveFile(content, { promptSaveAs: false });
```

## Development

```bash
# Install dependencies
npm install

# Run tests in Chrome and Firefox
npm test

# Run tests in watch mode
npm run test:watch

# Build the library
npm run build
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
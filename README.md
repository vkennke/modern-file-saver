# modern-file-saver

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/modern-file-saver.svg
[npm-url]: https://www.npmjs.com/package/modern-file-saver
[downloads-image]: https://img.shields.io/npm/dm/modern-file-saver.svg
[downloads-url]: https://www.npmjs.com/package/modern-file-saver

A modern file saving library for browsers that uses the File System Access API when available and falls back to the traditional download method when necessary.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
    - [Supported Input Types](#supported-input-types)
    - [Options](#options)
- [Browser Support](#browser-support)
    - [Limitations](#limitations)
- [Feature Detection](#feature-detection)
- [Examples](#examples)
    - [Basic Usage](#basic-usage)
    - [Advanced Examples](#advanced-examples)
- [Development](#development)
- [Contributing](#contributing)

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
```

The library supports various input formats like strings, base64, blobs, and more. See the [Examples](#examples) section for detailed usage examples.

### Supported Input Types

```typescript
type InputTypes =
    | string          // Plain text, base64, or data URLs
    | Blob            // Binary data with type information
    | ArrayBuffer     // Raw binary data
    | Uint8Array      // Binary data
    | URLSearchParams // Form data as URL parameters
    | FormData;       // Multipart form data
```

### Options

```typescript
interface SaveOptions {
    fileName?: string;          // Default: 'download'
    mimeType?: string;          // Default: based on input type
    promptSaveAs?: boolean;     // Default: true, uses File System Access API when available
    logLevel?: 'debug' | 'none' // Default: 'none
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

## Examples

### Basic Usage

```typescript
// String (plain text)
await saveFile('Hello World', { fileName: 'hello.txt' });

// String (base64)
await saveFile('SGVsbG8gV29ybGQ=', { fileName: 'decoded.txt' });

// String (data URL)
await saveFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', { fileName: 'data.txt' });

// Blob
const blob = new Blob(['Hello World'], { type: 'text/plain' });
await saveFile(blob, { fileName: 'blob.txt' });

// ArrayBuffer
const buffer = new TextEncoder().encode('Hello World').buffer;
await saveFile(buffer, { fileName: 'buffer.txt' });

// Uint8Array
const uint8 = new TextEncoder().encode('Hello World');
await saveFile(uint8, { fileName: 'binary.txt' });

// URLSearchParams
const params = new URLSearchParams({ hello: 'world' });
await saveFile(params, { fileName: 'params.txt' });

// FormData
const formData = new FormData();
formData.append('hello', 'world');
await saveFile(formData, { fileName: 'form.txt' });

// With debug logging
await saveFile('Hello World', {
    fileName: 'debug.txt',
    logLevel: 'debug'  // Will log operations to console
});
```

### Advanced Examples

```typescript
// JSON export with pretty printing
const jsonData = {
    users: [
        { id: 1, name: "John", role: "admin" },
        { id: 2, name: "Jane", role: "user" }
    ],
    metadata: {
        version: "1.0",
        exported: new Date().toISOString()
    }
};

await saveFile(
    JSON.stringify(jsonData, null, 2),
    {
        fileName: 'users.json',
        mimeType: 'application/json'
    }
);

// CSV export
const csvData = [
    ['id', 'name', 'email'],
    ['1', 'John Doe', 'john@example.com'],
    ['2', 'Jane Smith', 'jane@example.com']
].map(row => row.join(',')).join('\n');

await saveFile(csvData, {
    fileName: 'users.csv',
    mimeType: 'text/csv'
});

// API Response saving
try {
    const response = await fetch('https://api.example.com/data');
    const blob = await response.blob();
    await saveFile(blob, {
        fileName: 'api-data.json',
        mimeType: 'application/json'
    });
} catch (error) {
    console.error('Failed to save API data:', error);
}

// Canvas export
const canvas = document.querySelector('canvas');
if (canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    await saveFile(dataUrl, {
        fileName: 'canvas-export.png'
    });
}
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
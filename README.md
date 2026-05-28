# modern-file-saver

A modern file saving library for browsers that uses the File System Access API when available and falls back to the traditional download method when necessary.

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/modern-file-saver.svg
[npm-url]: https://www.npmjs.com/package/modern-file-saver
[downloads-image]: https://img.shields.io/npm/dm/modern-file-saver.svg
[downloads-url]: https://www.npmjs.com/package/modern-file-saver

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
    - [Bundle Variants](#bundle-variants)
    - [Supported Input Types](#supported-input-types)
    - [Options](#options)
    - [Base64 Handling](#base64-handling)
    - [Debug Logging](#debug-logging)
- [Browser Support](#browser-support)
    - [Limitations](#limitations)
- [Examples](#examples)
    - [Basic Usage](#basic-usage)
    - [Advanced Examples](#advanced-examples)
- [Migrating from file-saver](#migrating-from-file-saver)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🚀 Modern browser support with File System Access API
- 🔄 Automatic fallback for older browsers
- 🔐 Safe file handling
- 🎯 Multiple input formats supported
- 📄 Enhanced base64 support
- 💪 TypeScript support
- 📦 Zero dependencies
- 🪶 Tiny size (~3.1 kB minified, ~1.5 kB gzipped)

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

### Bundle Variants

The library provides both regular and minified bundles. You can choose which one to use based on your needs:

```typescript
// Regular bundle (default)
import { saveFile } from 'modern-file-saver';

// Minified bundle
import { saveFile } from 'modern-file-saver/min';
```

Both variants are available in CommonJS and ES Module formats and include TypeScript type definitions.

### Supported Input Types

The library supports various input formats like strings, base64, blobs, objects, and more. See the [Examples](#examples) section for detailed usage examples.

```typescript
type InputType =
    | string // Plain text, base64, or data URLs
    | Blob // Binary data with type information
    | ArrayBuffer // Raw binary data
    | Uint8Array // Binary data
    | URLSearchParams // Form data as URL parameters
    | FormData // Form data – serialised as application/x-www-form-urlencoded
    | object; // Will be JSON.stringified
```

### Options

```typescript
interface SaveOptions {
    // Default: input.name (if File) or 'download'
    fileName?: string;

    // Default: based on input type
    // - text/plain for strings
    // - application/json for objects
    // - application/octet-stream for binary data
    // - application/x-www-form-urlencoded for URLSearchParams and FormData
    mimeType?: string;

    // Default: true
    // When true, uses File System Access API's native save dialog in supporting browsers
    // When false, forces the traditional download method
    promptSaveAs?: boolean;

    // Default: false
    // When true, treats string input as base64 encoded data
    isBase64?: boolean;

    // Default: 'none'
    // Enable debug logging to console
    logLevel?: 'debug' | 'none';
}
```

### Base64 Handling

The library supports three ways to handle base64 data:

1. Data URLs (automatic detection):

```typescript
// Data URL is automatically detected and decoded
await saveFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', {
    fileName: 'hello.txt'
});
```

2. Raw base64 with flag:

```typescript
// Raw base64 string needs the isBase64 flag
await saveFile('SGVsbG8gV29ybGQ=', {
    fileName: 'hello.txt',
    isBase64: true,
    mimeType: 'text/plain'
});
```

3. Plain text (default):

```typescript
// Without isBase64 flag, base64-looking strings are treated as plain text
await saveFile('SGVsbG8gV29ybGQ=', {
    fileName: 'encoded.txt'
});
```

### Debug Logging

Enable debug logging to understand the file saving process:

```typescript
await saveFile(data, {
    fileName: 'data.json',
    logLevel: 'debug' // Will show operations in console
});
```

Debug logs are prefixed with `[modern-file-saver]` and include information about:

- Input type detection
- Blob conversion
- API selection (File System Access API vs fallback)
- Error handling

## Browser Support

### Modern Browsers (Chrome, Edge)

- Full support with File System Access API
- Native save dialog
- Secure context (HTTPS) required

### Other Browsers (Firefox, Safari)

- Automatic fallback to traditional download method
- Compatible with all supported input types
- No special requirements

### Legacy Browsers

- Requires modern JavaScript features (ES2024)

> **Note:** The published bundle is compiled to ES2024 – supported by all current evergreen browsers (Chrome, Edge, Firefox incl. ESR, Safari). The `engines.node` field requires Node.js 20+ for development/build only; the runtime is browser-only.

### Limitations

- File System Access API:
    - Not available in iframes
    - Requires secure context (HTTPS)
    - User permission required
- Base64:
    - Large base64 strings may impact performance
    - Memory usage proportional to data size
- FormData:
    - File inputs not supported in FormData
    - All values converted to strings

## Examples

### Basic Usage

```typescript
// String (plain text)
await saveFile('Hello World', { fileName: 'hello.txt' });

// String (base64 with explicit flag)
await saveFile('SGVsbG8gV29ybGQ=', {
    fileName: 'decoded.txt',
    isBase64: true,
    mimeType: 'text/plain'
});

// String (data URL)
await saveFile('data:text/plain;base64,SGVsbG8gV29ybGQ=', {
    fileName: 'data.txt'
});

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
```

### Advanced Examples

```typescript
// Save File object (the filename will be used automatically)
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async event => {
    const file = event.target.files[0];
    await saveFile(file); // will use file.name as fileName

    // Or override with custom filename
    await saveFile(file, { fileName: 'custom.txt' });
});

// Save object as JSON (automatic conversion)
const data = {
    users: [
        { id: 1, name: 'John', role: 'admin' },
        { id: 2, name: 'Jane', role: 'user' }
    ],
    metadata: {
        version: '1.0',
        exported: new Date().toISOString()
    }
};
// Object will be automatically stringified
await saveFile(data, { fileName: 'data.json' });

// CSV export
const csvData = [
    ['id', 'name', 'email'],
    ['1', 'John Doe', 'john@example.com'],
    ['2', 'Jane Smith', 'jane@example.com']
]
    .map(row => row.join(','))
    .join('\n');

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

// Canvas export (with data URL handling)
const canvas = document.querySelector('canvas');
if (canvas) {
    const dataUrl = canvas.toDataURL('image/png');
    await saveFile(dataUrl, {
        fileName: 'canvas-export.png'
    });
}

// Binary data handling with MIME type override
const response = await fetch('https://example.com/data');
const arrayBuffer = await response.arrayBuffer();
await saveFile(arrayBuffer, {
    fileName: 'data.bin',
    mimeType: 'application/octet-stream'
});

// Force legacy download method
await saveFile(data, {
    fileName: 'legacy.txt',
    promptSaveAs: false // Bypasses File System Access API
});
```

## Migrating from file-saver

[`file-saver`](https://github.com/eligrey/FileSaver.js) has been unmaintained since 2021. `modern-file-saver` is a zero-dependency drop-in replacement that adds [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) support (native save dialog in Chrome/Edge) with automatic fallback for other browsers.

|                          | `file-saver`          | `modern-file-saver` |
| ------------------------ | --------------------- | ------------------- |
| Last release             | 2021                  | Active              |
| File System Access API   | ❌                    | ✅                  |
| TypeScript               | ❌ (types via @types) | ✅ (built-in)       |
| ESM / tree-shakeable     | ❌                    | ✅                  |
| Bundle size (min + gzip) | ~2.7 kB               | ~1.5 kB             |
| Zero dependencies        | ✅                    | ✅                  |
| npm provenance           | ❌                    | ✅                  |

### API Comparison

```typescript
// file-saver
import { saveAs } from 'file-saver';
saveAs(blob, 'hello.txt');

// modern-file-saver
import { saveFile } from 'modern-file-saver';
await saveFile(blob, { fileName: 'hello.txt' });
```

The main differences:

- `saveFile` is **async** (returns `Promise<void>`) – it awaits the File System Access API dialog and cleans up resources correctly
- URL strings are **not** fetched automatically – fetch the response yourself and pass the `Blob` for full control over error handling
- `fileName` is passed as part of the options object instead of a second positional argument

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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

When your change warrants a release (bug fix, new feature, breaking change), please include a changeset:

```bash
npx changeset
```

This will prompt you for the change type (patch / minor / major) and a short description that will appear in the changelog.

## License

ISC

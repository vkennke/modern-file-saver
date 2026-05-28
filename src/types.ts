import { LogLevel } from './utils/logger';

/**
 * Supported input types for {@link saveFile}.
 *
 * Note: `Record<string, unknown> | unknown[]` covers plain objects and arrays
 * which will be serialised with `JSON.stringify`. Class instances are also
 * allowed but their non-enumerable members will not be serialised.
 */
export type InputType =
    | string // Plain text, base64, or data URLs
    | Blob // Binary data with type information (also File)
    | ArrayBuffer // Raw binary data
    | ArrayBufferView // Uint8Array and other typed arrays / DataView
    | URLSearchParams // Form data as URL parameters
    | FormData // Multipart form data
    | Record<string, unknown> // Plain objects -> JSON
    | readonly unknown[]; // Arrays -> JSON

export interface SaveOptions {
    // Default: input.name (if File) or 'download'
    fileName?: string;

    // Default: based on input type
    // - text/plain for strings
    // - application/json for objects
    // - application/octet-stream for binary data
    // - application/x-www-form-urlencoded for URLSearchParams
    // - multipart/form-data for FormData
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
    logLevel?: LogLevel;
}

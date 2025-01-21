import { LogLevel } from './utils/logger';

export type InputType =
    | string // Plain text, base64, or data URLs
    | Blob // Binary data with type information
    | ArrayBuffer // Raw binary data
    | Uint8Array // Binary data
    | URLSearchParams // Form data as URL parameters
    | FormData // Multipart form data
    | object; // Will be JSON.stringified

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

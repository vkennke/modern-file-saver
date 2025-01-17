import {LogLevel} from './utils/logger';

export type InputType =
    | string          // Raw string oder base64
    | Blob            // Browser Blob
    | ArrayBuffer     // Binary data
    | Uint8Array      // Binary data
    | URLSearchParams // Query parameters
    | FormData;       // Form data

export interface SaveOptions {
    fileName?: string;
    mimeType?: string;
    promptSaveAs?: boolean;  // Show FileSystem Access API dialog?
    logLevel?: LogLevel;
}

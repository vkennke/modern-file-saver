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
    /**
     * The filename for the saved file.
     * @default input.name (if File) or 'download'
     */
    fileName?: string;

    /**
     * The MIME type of the saved file.
     * Defaults to a sensible value based on the input type:
     * - `text/plain` for strings
     * - `application/json` for objects/arrays
     * - `application/octet-stream` for binary data
     * - `application/x-www-form-urlencoded` for URLSearchParams/FormData
     */
    mimeType?: string;

    /**
     * When `true`, uses the File System Access API's native save dialog in supporting browsers.
     * When `false`, forces the traditional anchor-download fallback.
     * @default true
     */
    promptSaveAs?: boolean;

    /**
     * When `true`, treats string input as base64-encoded data.
     * @default false
     */
    isBase64?: boolean;

    /**
     * Log level for debug output.
     * - `'debug'`: verbose logging to console
     * - `'warn'`: only warnings (e.g. API fallback)
     * - `'none'`: silent
     * @default 'none'
     */
    logLevel?: LogLevel;
}

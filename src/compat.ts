import { saveFile } from './index';
import type { SaveOptions } from './types';
import { createLogger, type LogLevel, type Logger } from './utils/logger';
import { clickAnchor } from './utils/anchor';

export { saveFile } from './index';
export type { InputType, SaveOptions } from './types';
export type { LogLevel, Logger } from './utils/logger';

/**
 * Input accepted by {@link saveAs}. Strings are treated as **URLs** (as in
 * `file-saver`), not as file content – pass `saveFile()` a string to write it
 * verbatim.
 */
export type FileSaverInput = Blob | string;

export interface FileSaverOptions {
    /**
     * Prepend a UTF-8 BOM when the blob's MIME type marks it as UTF-8 text or
     * XML. Identical to `file-saver`'s `autoBom`.
     * @default false
     */
    autoBom?: boolean;

    /**
     * Opt into the File System Access API's native save dialog.
     *
     * Defaults to `false` so a swapped-in `saveAs()` behaves exactly like
     * `file-saver` did. Enable it – or move to `saveFile()` – to get the native
     * dialog in Chromium-based browsers.
     * @default false
     */
    promptSaveAs?: boolean;

    /**
     * Log level for debug output, forwarded to `saveFile()`.
     * @default 'none'
     */
    logLevel?: LogLevel;
}

const UTF8_CHARSET_PATTERN = /charset\s*=\s*utf-8/i;

const INNER_WHITESPACE_PATTERN = /\s/;

const DEFAULT_FILE_NAME = 'download';

/**
 * Whether `file-saver` would prepend a BOM for this MIME type.
 *
 * `file-saver` classified the whole type with one pattern. Its `\S*` groups also
 * match `/` and `;`, which makes that pattern quadratic on adversarial input
 * (CWE-1333), so the type is split at its first parameter separator and both
 * halves are checked without an ambiguous repetition. The only inputs
 * classified differently are MIME types whose essence contains a `;`, which are
 * malformed to begin with.
 */
function isUtf8Text(mimeType: string): boolean {
    const separator = mimeType.indexOf(';');
    if (separator === -1) {
        return false;
    }

    const essence = mimeType.slice(0, separator).trim().toLowerCase();
    if (INNER_WHITESPACE_PATTERN.test(essence)) {
        return false;
    }

    const isTextual =
        essence.startsWith('text/') ||
        essence === 'application/xml' ||
        (essence.includes('/') && essence.endsWith('+xml'));

    return isTextual && UTF8_CHARSET_PATTERN.test(mimeType.slice(separator + 1));
}

function reportError(message: string, error: unknown): void {
    // Deliberately not routed through the logger: `saveAs()` swallows failures
    // for `file-saver` parity, so this is the only signal a caller ever gets.
    console.error(`[modern-file-saver] ${message}`, error);
}

/**
 * `file-saver` originally took a `disableAutoBOM` boolean as third argument and
 * later switched to an options object while keeping the boolean working.
 */
function normaliseOptions(options: FileSaverOptions | boolean | undefined): FileSaverOptions {
    if (options === undefined || options === null) {
        return {};
    }
    if (typeof options !== 'object') {
        console.warn(
            '[modern-file-saver] Deprecated: expected the third argument of saveAs() to be an object'
        );
        return { autoBom: !options };
    }
    return options;
}

function withBom(blob: Blob, autoBom: boolean | undefined): Blob {
    if (!autoBom || !isUtf8Text(blob.type)) {
        return blob;
    }
    // The browser encodes the U+FEFF code point as EF BB BF.
    return new Blob(['\uFEFF', blob], { type: blob.type });
}

function resolveFileName(blob: Blob, fileName: string | undefined): string {
    return fileName || (blob instanceof File ? blob.name : '') || DEFAULT_FILE_NAME;
}

/** Best-effort filename from a URL path – better than always using "download". */
function fileNameFromUrl(url: URL): string | undefined {
    const segment = url.pathname.split('/').pop();
    if (!segment) {
        return undefined;
    }
    try {
        return decodeURIComponent(segment);
    } catch {
        // Stray percent signs are legal in a URL path but break
        // `decodeURIComponent`. Deriving a nicer filename must never fail an
        // otherwise successful save, so the raw segment wins.
        return segment;
    }
}

function saveBlob(blob: Blob, fileName: string, options: FileSaverOptions): Promise<void> {
    const saveOptions: SaveOptions = {
        fileName,
        promptSaveAs: options.promptSaveAs ?? false,
        ...(options.logLevel === undefined ? {} : { logLevel: options.logLevel })
    };
    return saveFile(blob, saveOptions);
}

async function saveFromUrl(
    url: string,
    fileName: string | undefined,
    options: FileSaverOptions,
    logger: Logger
): Promise<void> {
    const resolved = new URL(url, location.href);

    // Same-origin without the native dialog: let the browser stream the
    // response straight to disk via the `download` attribute – exactly what
    // `file-saver` did, and it never buffers the body in memory. An empty
    // `download` value still forces a download but lets the browser derive the
    // name from Content-Disposition or the URL.
    if (resolved.origin === location.origin && !options.promptSaveAs) {
        logger.debug('Downloading same-origin URL via anchor', { url: resolved.href });
        await clickAnchor(resolved.href, { download: fileName ?? '', rel: 'noopener' });
        return;
    }

    logger.debug('Fetching URL', { url: resolved.href });
    let blob: Blob;
    try {
        const response = await fetch(resolved.href);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        blob = await response.blob();
    } catch (err) {
        // `file-saver` probed CORS with a synchronous XHR and opened the link in
        // a new tab when that failed. A rejected `fetch` is the same signal
        // without the deprecated synchronous request.
        reportError('Could not download file, opening it in a new tab instead', err);
        await clickAnchor(resolved.href, { target: '_blank', rel: 'noopener noreferrer' });
        return;
    }

    await saveBlob(
        withBom(blob, options.autoBom),
        resolveFileName(blob, fileName ?? fileNameFromUrl(resolved)),
        options
    );
}

async function saveAsImpl(
    data: FileSaverInput,
    fileName?: string,
    options?: FileSaverOptions | boolean
): Promise<void> {
    const resolvedOptions = normaliseOptions(options);
    const logger = createLogger(resolvedOptions.logLevel);

    try {
        if (typeof data === 'string') {
            await saveFromUrl(data, fileName, resolvedOptions, logger);
            return;
        }
        // The filename is resolved from the *original* input: `withBom()` wraps
        // a `File` into a plain `Blob`, which would drop the `File.name`
        // fallback that `file-saver` relies on.
        await saveBlob(
            withBom(data, resolvedOptions.autoBom),
            resolveFileName(data, fileName),
            resolvedOptions
        );
    } catch (err) {
        // `file-saver`'s `saveAs()` is fire-and-forget and never throws.
        // Rejecting here would turn untouched legacy call sites into unhandled
        // rejections, so failures are reported to the console instead. Use
        // `saveFile()` when you need to handle errors.
        reportError('saveAs() failed', err);
    }
}

export interface SaveAs {
    /**
     * Drop-in replacement for `file-saver`'s `saveAs()`.
     *
     * @param data   A `Blob`/`File`, or a string that is treated as a **URL**.
     * @param fileName Suggested filename. Defaults to `File.name`, the URL's
     *                 last path segment, or `'download'`.
     * @param options `{ autoBom, promptSaveAs, logLevel }`. A boolean is
     *                accepted as the legacy `disableAutoBOM` flag.
     * @returns A promise that resolves once the save finished. It **never
     *          rejects** – errors go to `console.error`.
     */
    (data: FileSaverInput, fileName?: string, options?: FileSaverOptions | boolean): Promise<void>;

    /** Mirrors `file-saver`'s `FileSaver.saveAs` access pattern. */
    saveAs: SaveAs;
}

const saveAs = saveAsImpl as SaveAs;
saveAs.saveAs = saveAs;

export { saveAs };
export default saveAs;

/// <reference types="wicg-file-system-access" />

import { InputType, SaveOptions } from './types';
import { convertToBlob, describeInput, resolveMimeType } from './utils/blob';
import { createLogger, type Logger } from './utils/logger';
import { getFilePickerOptions } from './utils/file-picker';

export type { InputType, SaveOptions } from './types';
export type { LogLevel, Logger } from './utils/logger';

/**
 * Upper bound for the wait between clicking the anchor and revoking its object
 * URL. `requestAnimationFrame` normally settles this far earlier; the timeout
 * only matters when rAF never fires (see {@link nextFrame}).
 */
const ANCHOR_CLEANUP_TIMEOUT_MS = 50;

export async function saveFile(input: InputType, options: SaveOptions = {}): Promise<void> {
    const {
        fileName = input instanceof File ? input.name : 'download',
        promptSaveAs = true,
        logLevel = 'none'
    } = options;

    const logger = createLogger(logLevel);
    logger.debug('Saving file', { fileName, input: describeInput(input) });

    // Modern File System Access API
    if (promptSaveAs && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        // The picker is opened *before* the input is converted: it requires
        // transient user activation, which expires a few seconds after the
        // originating user gesture, and serialising a large payload could burn
        // that budget. `resolveMimeType` validates the input up front so
        // unsupported input still fails before any dialog is shown.
        const mimeType = resolveMimeType(input, options);

        let handle: FileSystemFileHandle | undefined;
        try {
            logger.debug('Attempting to use File System Access API', { mimeType });
            handle = await window.showSaveFilePicker(getFilePickerOptions(mimeType, fileName));
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                logger.debug('User aborted File System Access API save dialog');
                throw err;
            }
            logger.warn('File System Access API failed, falling back to legacy method', err);
        }

        if (handle) {
            // A handle was obtained – write errors are NOT silently caught here,
            // they propagate to the caller (no fallback after a successful picker).
            const blob = convertToBlob(input, options);
            logger.debug('Blob created', { type: blob.type, size: blob.size });

            logger.debug('File handle obtained, creating writable');
            const writable = await handle.createWritable();
            try {
                await writable.write(blob);
                await writable.close();
            } catch (err) {
                // Discard the partially-written file. `abort()` may itself reject
                // (e.g. if the writable is already in an errored state); we must
                // not let that mask the original write error.
                await writable.abort().catch(() => {
                    /* swallow abort error – original error wins */
                });
                throw err;
            }
            logger.debug('File saved successfully using File System Access API');
            return;
        }
    } else {
        logger.debug('Using legacy download method', {
            reason: promptSaveAs ? 'API not available' : 'promptSaveAs is false'
        });
    }

    // Fallback for older browsers, Firefox, or if promptSaveAs is false.
    const blob = convertToBlob(input, options);
    logger.debug('Blob created', { type: blob.type, size: blob.size });
    await saveViaAnchor(blob, fileName, logger);
}

/**
 * Yield once so the browser can pick up the anchor click before the object URL
 * is revoked.
 *
 * `requestAnimationFrame` is the right signal (it fires after the click task has
 * been processed) but it never fires in hidden or backgrounded tabs. Racing it
 * against a timeout keeps the fast path while guaranteeing that `saveFile()`
 * always settles – otherwise the returned promise would hang forever and the
 * object URL would leak.
 */
function nextFrame(): Promise<void> {
    return new Promise<void>(resolve => {
        let settled = false;
        const done = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            resolve();
        };

        const timer = setTimeout(done, ANCHOR_CLEANUP_TIMEOUT_MS);
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(done);
        }
    });
}

async function saveViaAnchor(blob: Blob, fileName: string, logger: Logger): Promise<void> {
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);

        try {
            link.click();
            await nextFrame();
        } finally {
            link.parentNode?.removeChild(link);
        }
    } finally {
        URL.revokeObjectURL(url);
        logger.debug('File saved successfully using legacy method');
    }
}

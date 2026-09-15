/// <reference types="wicg-file-system-access" />

import { InputType, SaveOptions } from './types';
import { convertToBlob, describeInput, resolveMimeType } from './utils/blob';
import { createLogger, type Logger } from './utils/logger';
import { getFilePickerOptions } from './utils/file-picker';
import { clickAnchor } from './utils/anchor';

export type { InputType, SaveOptions } from './types';
export type { LogLevel, Logger } from './utils/logger';

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

async function saveViaAnchor(blob: Blob, fileName: string, logger: Logger): Promise<void> {
    const url = URL.createObjectURL(blob);
    try {
        await clickAnchor(url, { download: fileName });
    } finally {
        URL.revokeObjectURL(url);
        logger.debug('File saved successfully using legacy method');
    }
}

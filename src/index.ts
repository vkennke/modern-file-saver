/// <reference types="wicg-file-system-access" />

import { InputType, SaveOptions } from './types';
import { convertToBlob } from './utils/blob';
import { createLogger } from './utils/logger';
import { getFilePickerOptions } from './utils/file-picker';

export type { InputType, SaveOptions } from './types';
export type { LogLevel, Logger } from './utils/logger';

export async function saveFile(input: InputType, options: SaveOptions = {}): Promise<void> {
    const {
        fileName = input instanceof File ? input.name : 'download',
        promptSaveAs = true,
        logLevel = 'none'
    } = options;

    const logger = createLogger(logLevel);

    logger.debug('Converting input to blob', {
        type:
            input === null || input === undefined
                ? String(input)
                : ((input as object).constructor?.name ?? typeof input)
    });
    const blob = await convertToBlob(input, options);
    logger.debug('Blob created', { type: blob.type, size: blob.size });

    // Modern File System Access API
    if (promptSaveAs && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
            logger.debug('Attempting to use File System Access API');
            const handle = await window.showSaveFilePicker(getFilePickerOptions(blob, fileName));

            logger.debug('File handle obtained, creating writable');
            const writable = await handle.createWritable();
            try {
                await writable.write(blob);
            } finally {
                await writable.close();
            }
            logger.debug('File saved successfully using File System Access API');
            return;
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                logger.debug('User aborted File System Access API save dialog');
                throw err;
            }
            logger.debug('File System Access API failed, falling back to legacy method', err);
        }
    } else {
        logger.debug('Using legacy download method', {
            reason: promptSaveAs ? 'API not available' : 'promptSaveAs is false'
        });
    }

    // Fallback for older browsers, Firefox, or if promptSaveAs is false.
    await saveViaAnchor(blob, fileName, logger);
}

async function saveViaAnchor(
    blob: Blob,
    fileName: string,
    logger: ReturnType<typeof createLogger>
): Promise<void> {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);

    try {
        link.click();
        // Yield once so the browser can pick up the click before we revoke the URL.
        await new Promise<void>(resolve => {
            // requestAnimationFrame is sufficient in modern browsers; setTimeout
            // is used as a fallback for environments without rAF (e.g. headless).
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => resolve());
            } else {
                setTimeout(resolve, 0);
            }
        });
    } finally {
        URL.revokeObjectURL(url);
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
        logger.debug('File saved successfully using legacy method');
    }
}

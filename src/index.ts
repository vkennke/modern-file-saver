import { InputType, SaveOptions } from './types';
import { convertToBlob } from './utils/blob';
import { createLogger } from './utils/logger';
import { getFilePickerOptions } from './utils/file-picker';

export async function saveFile(input: InputType, options: SaveOptions = {}): Promise<void> {
    const {
        fileName = input instanceof File ? input.name : 'download',
        promptSaveAs = true,
        logLevel = 'none'
    } = options;

    const logger = createLogger(logLevel);

    try {
        logger.debug('Converting input to blob', { type: input.constructor.name });
        const blob = await convertToBlob(input, options);
        logger.debug('Blob created', { type: blob.type, size: blob.size });

        // Modern File System Access API
        if (promptSaveAs && 'showSaveFilePicker' in window) {
            try {
                logger.debug('Attempting to use File System Access API');
                const handle = await window.showSaveFilePicker(
                    getFilePickerOptions(blob, fileName)
                );

                logger.debug('File handle obtained, creating writable');
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                logger.debug('File saved successfully using File System Access API');
                return;
            } catch (err) {
                if ((err as Error).name === 'AbortError') {
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

        // fallback for older browsers, Firefox or if promptSaveAs is false
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(link);
            logger.debug('File saved successfully using legacy method');
        }, 100);
    } catch (error) {
        logger.debug('Error saving file:', error);
        throw error;
    }
}

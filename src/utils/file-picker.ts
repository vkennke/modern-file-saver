/// <reference types="wicg-file-system-access" />

/**
 * Build the options object for `window.showSaveFilePicker`.
 * Sanitises the MIME type and infers the file extension from the filename.
 */
export function getFilePickerOptions(blob: Blob, fileName: string): SaveFilePickerOptions {
    // make sure that the MIME type has the format type/subtype
    let mimeType = blob.type || 'application/octet-stream';
    if (!/^[^/\s]+\/[^/\s]+/.test(mimeType)) {
        mimeType = 'application/octet-stream';
    }
    // strip parameters like "; charset=utf-8" which the picker doesn't accept
    mimeType = mimeType.split(';')[0]!.trim();

    const lastDot = fileName.lastIndexOf('.');
    const hasExtension = lastDot > 0 && lastDot < fileName.length - 1;
    const types: SaveFilePickerOptions['types'] = hasExtension
        ? [
              {
                  description: 'File',
                  accept: {
                      [mimeType as MIMEType]: [`.${fileName.slice(lastDot + 1)}` as FileExtension]
                  }
              }
          ]
        : undefined;

    return {
        suggestedName: fileName,
        ...(types ? { types } : {})
    };
}

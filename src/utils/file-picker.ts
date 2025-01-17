export function getFilePickerOptions(blob: Blob, fileName: string): SaveFilePickerOptions {
    // make sure that the MIME type has the format type/subtype
    let mimeType = blob.type || 'application/octet-stream';
    if (!mimeType.includes('/')) {
        mimeType = 'application/octet-stream';
    }

    let extension = fileName.split('.').pop() || 'bin';
    extension = extension.startsWith('.') ? extension : `.${extension}`;

    const accept: Record<MIMEType, FileExtension[]> = {
        [mimeType as MIMEType]: [extension as FileExtension]
    };

    return {
        suggestedName: fileName,
        types: [{
            description: 'File',
            accept
        }]
    };
}
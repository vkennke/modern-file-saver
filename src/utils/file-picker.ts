/// <reference types="wicg-file-system-access" />

/** `type/subtype` using the RFC 9110 token charset, parameters excluded. */
const MIME_PATTERN = /^[a-z0-9!#$%&'*+.^_`|~-]+\/[a-z0-9!#$%&'*+.^_`|~-]+$/i;

/**
 * Chrome rejects `accept` extensions that are longer than 16 characters,
 * contain anything outside `[a-z0-9+.-]` or end with a dot. An invalid value
 * makes `showSaveFilePicker()` throw a TypeError, which would silently degrade
 * the save to the anchor fallback – so such extensions are dropped instead.
 */
const EXTENSION_PATTERN = /^\.[a-z0-9+.-]{0,14}[a-z0-9+-]$/i;

function normaliseMimeType(rawType: string): MIMEType {
    // Strip parameters like "; charset=utf-8" which the picker doesn't accept.
    const candidate = rawType.replace(/;.*$/s, '').trim();
    return (MIME_PATTERN.test(candidate) ? candidate : 'application/octet-stream') as MIMEType;
}

function getExtension(fileName: string): `.${string}` | undefined {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === fileName.length - 1) {
        return undefined;
    }
    const extension = `.${fileName.slice(lastDot + 1)}` as const;
    return EXTENSION_PATTERN.test(extension) ? extension : undefined;
}

/**
 * Build the options object for `window.showSaveFilePicker`.
 * Sanitises the MIME type and infers the file extension from the filename.
 */
export function getFilePickerOptions(mimeType: string, fileName: string): SaveFilePickerOptions {
    const extension = getExtension(fileName);
    if (!extension) {
        return { suggestedName: fileName };
    }

    return {
        suggestedName: fileName,
        types: [
            {
                description: 'File',
                accept: { [normaliseMimeType(mimeType)]: [extension] }
            }
        ]
    };
}

import { InputType, SaveOptions } from '../types';

function isBase64DataUrl(str: string): boolean {
    return str.startsWith('data:') && str.includes(';base64,');
}

/**
 * Decode a base64 string (or base64 data URL) to a Blob.
 * Uses atob + Uint8Array directly instead of `fetch(dataUrl)` for performance
 * and to get a real error on invalid base64 input.
 */
function base64ToBlob(base64: string, mimeType?: string): Blob {
    let rawBase64 = base64;
    let detectedMime: string | undefined;

    if (isBase64DataUrl(base64)) {
        const match = /^data:([^;,]*)?;base64,(.*)$/s.exec(base64);
        if (!match) {
            throw new Error('Invalid base64 data URL');
        }
        detectedMime = match[1] || undefined;
        rawBase64 = match[2] ?? '';
    }

    // atob throws DOMException 'InvalidCharacterError' on invalid input
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return new Blob([bytes], {
        type: mimeType || detectedMime || 'application/octet-stream'
    });
}

function isPlainObjectOrArray(input: unknown): input is Record<string, unknown> | unknown[] {
    if (input === null || typeof input !== 'object') {
        return false;
    }
    if (
        input instanceof Blob ||
        input instanceof ArrayBuffer ||
        ArrayBuffer.isView(input) ||
        input instanceof URLSearchParams ||
        input instanceof FormData ||
        input instanceof Date ||
        input instanceof Map ||
        input instanceof Set
    ) {
        return false;
    }
    return true;
}

export async function convertToBlob(input: InputType, options: SaveOptions = {}): Promise<Blob> {
    // String handling
    if (typeof input === 'string') {
        // Case 1: Explicit base64 flag
        if (options.isBase64) {
            return base64ToBlob(input, options.mimeType);
        }

        // Case 2: Data URL with base64 encoding
        if (isBase64DataUrl(input)) {
            return base64ToBlob(input, options.mimeType);
        }

        // Case 3: Plain string
        return new Blob([input], {
            type: options.mimeType || 'text/plain'
        });
    }

    // Blob (also File)
    if (input instanceof Blob) {
        if (options.mimeType && options.mimeType !== input.type) {
            // if a different MIME type is required, a new blob is created
            return new Blob([await input.arrayBuffer()], { type: options.mimeType });
        }
        return input;
    }

    // ArrayBuffer or TypedArray / DataView
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        return new Blob([input as BlobPart], {
            type: options.mimeType || 'application/octet-stream'
        });
    }

    // URLSearchParams
    if (input instanceof URLSearchParams) {
        return new Blob([input.toString()], {
            type: options.mimeType || 'application/x-www-form-urlencoded'
        });
    }

    // FormData – serialise as x-www-form-urlencoded (we don't generate multipart
    // boundaries here). The MIME type reflects the actual on-disk format.
    if (input instanceof FormData) {
        const pairs: string[] = [];
        input.forEach((value, key) => {
            // Browsers stringify File values to "[object File]" via toString();
            // we keep parity with that behaviour but skip null/undefined-ish values
            // explicitly for readability.
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        });
        return new Blob([pairs.join('&')], {
            type: options.mimeType || 'application/x-www-form-urlencoded'
        });
    }

    // Object / Array handling (automatically convert to JSON) – checked last so
    // none of the structured types above are accidentally treated as JSON.
    if (isPlainObjectOrArray(input)) {
        return new Blob([JSON.stringify(input, null, 2)], {
            type: options.mimeType || 'application/json'
        });
    }

    throw new Error('Unsupported input type');
}

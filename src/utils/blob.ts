import {InputType, SaveOptions} from '../types';

function isBase64DataUrl(str: string): boolean {
    return str.startsWith('data:') && str.includes(';base64,');
}

function isBase64String(str: string): boolean {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
}

function isBase64(str: string): boolean {
    return isBase64DataUrl(str) || isBase64String(str);
}

async function base64ToBlob(base64: string, mimeType?: string): Promise<Blob> {
    if (isBase64DataUrl(base64)) {
        // Already a data URL, use it directly
        const response = await fetch(base64);
        return response.blob();
    }

    // Regular base64, convert to data URL
    const dataUrl = `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
    const response = await fetch(dataUrl);
    return response.blob();
}

export async function convertToBlob(
    input: InputType,
    options: SaveOptions = {}
): Promise<Blob> {
    // String handling
    if (typeof input === 'string') {
        // Base64 detection
        if (isBase64(input)) {
            return base64ToBlob(input, options.mimeType);
        }
        // Regular string (e.g. JSON)
        return new Blob([input], {
            type: options.mimeType || 'text/plain'
        });
    }

    // Blob
    if (input instanceof Blob) {
        if (options.mimeType && options.mimeType !== input.type) {
            // if a different MIME type is required, a new blob is created
            return new Blob([await input.arrayBuffer()], { type: options.mimeType });
        }
        return input;
    }

    // ArrayBuffer or TypedArray
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        return new Blob([input], {
            type: options.mimeType || 'application/octet-stream'
        });
    }

    // URLSearchParams
    if (input instanceof URLSearchParams) {
        return new Blob([input.toString()], {
            type: 'application/x-www-form-urlencoded'
        });
    }

    // FormData
    if (input instanceof FormData) {
        const pairs: string[] = [];
        input.forEach((value, key) => {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`);
        });
        return new Blob([pairs.join('&')], {
            type: 'multipart/form-data'
        });
    }

    throw new Error('Unsupported input type');
}
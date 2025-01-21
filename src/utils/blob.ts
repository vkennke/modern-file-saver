import { InputType, SaveOptions } from '../types';

function isBase64DataUrl(str: string): boolean {
    return str.startsWith('data:') && str.includes(';base64,');
}

async function base64ToBlob(base64: string, mimeType?: string): Promise<Blob> {
    const dataUrl = isBase64DataUrl(base64)
        ? base64
        : `data:${mimeType || 'application/octet-stream'};base64,${base64}`;

    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // If mimeType is explicitly provided, create a new Blob with that type
    if (mimeType && blob.type !== mimeType) {
        return new Blob([await blob.arrayBuffer()], { type: mimeType });
    }

    return blob;
}

export async function convertToBlob(input: InputType, options: SaveOptions = {}): Promise<Blob> {
    // Object handling (automatically convert to JSON)
    if (isObjectType(input)) {
        return new Blob([JSON.stringify(input, null, 2)], {
            type: options.mimeType || 'application/json'
        });
    }

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

function isObjectType(input: InputType): boolean {
    return (
        typeof input === 'object' &&
        !(input instanceof Blob) &&
        !(input instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(input) &&
        !(input instanceof URLSearchParams) &&
        !(input instanceof FormData)
    );
}

import { InputType, SaveOptions } from '../types';

const DEFAULT_BINARY_MIME_TYPE = 'application/octet-stream';
const DEFAULT_TEXT_MIME_TYPE = 'text/plain';
const DEFAULT_JSON_MIME_TYPE = 'application/json';
const DEFAULT_FORM_MIME_TYPE = 'application/x-www-form-urlencoded';

/**
 * `data:[<mediatype>][;base64],<data>` – the media type may carry parameters
 * (e.g. `data:text/plain;charset=utf-8;base64,...`), so everything up to the
 * first comma is the header and is split on `;` afterwards.
 */
const DATA_URL_PATTERN = /^data:([^,]*),(.*)$/s;

interface ParsedDataUrl {
    /** Media type incl. parameters; `undefined` when the data URL omits it. */
    mimeType: string | undefined;
    isBase64: boolean;
    data: string;
}

function parseDataUrl(value: string): ParsedDataUrl | undefined {
    if (!value.startsWith('data:')) {
        return undefined;
    }

    const match = DATA_URL_PATTERN.exec(value);
    if (!match) {
        return undefined;
    }

    const segments = (match[1] ?? '').split(';').map(segment => segment.trim());
    const isBase64 = segments.at(-1)?.toLowerCase() === 'base64';
    const mediaType = (isBase64 ? segments.slice(0, -1) : segments)
        .filter(segment => segment.length > 0)
        .join(';');

    return {
        mimeType: mediaType || undefined,
        isBase64,
        data: match[2] ?? ''
    };
}

const uint8ArrayConstructor = Uint8Array as unknown as {
    fromBase64?: (base64: string) => Uint8Array<ArrayBuffer>;
};

/**
 * Decode a base64 string to bytes.
 *
 * `Uint8Array.fromBase64()` decodes natively and avoids materialising the
 * intermediate binary string that `atob()` needs (which doubles peak memory and
 * costs an extra pass over the data). It is stricter than `atob()` though – it
 * rejects embedded whitespace and lenient padding – so `atob()` stays as the
 * fallback for both older engines and input that `fromBase64()` refuses.
 */
function decodeBase64(base64: string): Uint8Array<ArrayBuffer> {
    if (typeof uint8ArrayConstructor.fromBase64 === 'function') {
        try {
            return uint8ArrayConstructor.fromBase64(base64);
        } catch {
            // Fall through – `atob` is more forgiving and still throws on real garbage.
        }
    }

    // atob throws DOMException 'InvalidCharacterError' on invalid input
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export function describeInput(input: unknown): string {
    if (input === null || input === undefined) {
        return String(input);
    }
    if (typeof input !== 'object') {
        return typeof input;
    }
    return input.constructor?.name ?? 'object';
}

/**
 * Structured types that have a dedicated conversion branch (or are explicitly
 * unsupported) and must never be treated as "plain object -> JSON".
 */
function isStructuredType(input: object): boolean {
    return (
        input instanceof Blob ||
        input instanceof ArrayBuffer ||
        ArrayBuffer.isView(input) ||
        input instanceof URLSearchParams ||
        input instanceof FormData ||
        input instanceof Date ||
        input instanceof Map ||
        input instanceof Set
    );
}

function isJsonSerialisable(input: unknown): input is Record<string, unknown> | unknown[] {
    if (input === null || typeof input !== 'object') {
        return false;
    }
    if (isStructuredType(input)) {
        return false;
    }
    if (Array.isArray(input)) {
        return true;
    }

    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype === null || prototype === Object.prototype) {
        return true;
    }

    // Class instances stay supported as long as they carry own enumerable data.
    // Error, Promise, RegExp, WeakMap, … all stringify to "{}" because their
    // state lives in non-enumerable properties or internal slots – accepting
    // them would silently write an empty file instead of reporting the problem.
    return Object.keys(input).length > 0;
}

function unsupportedInputError(input: unknown): Error {
    return new Error(
        `Unsupported input type: ${describeInput(input)}. Supported inputs are ` +
            `string, Blob/File, ArrayBuffer, TypedArray/DataView, URLSearchParams, ` +
            `FormData, plain objects and arrays.`
    );
}

/**
 * FormData is serialised as x-www-form-urlencoded (we don't generate multipart
 * boundaries here), and that format has no way to represent binary content.
 * Silently dropping the bytes – or serialising only the filename – would
 * corrupt the saved file without the caller noticing, so binary entries are
 * rejected with an actionable message instead.
 */
function assertSerialisableFormData(formData: FormData): void {
    formData.forEach((value, key) => {
        if (value instanceof Blob) {
            const kind = value instanceof File ? `File "${value.name}"` : 'Blob';
            throw new Error(
                `FormData entry "${key}" is a ${kind}; x-www-form-urlencoded ` +
                    `cannot represent binary data. Pass the File/Blob directly to ` +
                    `saveFile() or serialise the FormData yourself (e.g. as multipart).`
            );
        }
    });
}

/**
 * Resolve the MIME type the saved file will have, without serialising the input.
 *
 * This is deliberately cheap so that `saveFile()` can open the native save
 * dialog *before* running the (potentially expensive) conversion: the File
 * System Access API requires transient user activation, which expires a few
 * seconds after the originating user gesture.
 *
 * It doubles as a pre-flight validation – unsupported input and FormData with
 * binary entries are rejected here, i.e. before any save dialog is shown.
 *
 * @throws if the input type is not supported.
 */
export function resolveMimeType(input: InputType, options: SaveOptions = {}): string {
    if (typeof input === 'string') {
        if (options.mimeType) {
            return options.mimeType;
        }
        const dataUrl = parseDataUrl(input);
        if (dataUrl?.isBase64) {
            return dataUrl.mimeType ?? DEFAULT_BINARY_MIME_TYPE;
        }
        return options.isBase64 ? DEFAULT_BINARY_MIME_TYPE : DEFAULT_TEXT_MIME_TYPE;
    }

    if (input instanceof Blob) {
        return options.mimeType || input.type || DEFAULT_BINARY_MIME_TYPE;
    }

    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        return options.mimeType || DEFAULT_BINARY_MIME_TYPE;
    }

    if (input instanceof URLSearchParams) {
        return options.mimeType || DEFAULT_FORM_MIME_TYPE;
    }

    if (input instanceof FormData) {
        assertSerialisableFormData(input);
        return options.mimeType || DEFAULT_FORM_MIME_TYPE;
    }

    if (isJsonSerialisable(input)) {
        return options.mimeType || DEFAULT_JSON_MIME_TYPE;
    }

    throw unsupportedInputError(input);
}

/**
 * Convert any supported input into a `Blob`.
 *
 * Synchronous: none of the supported input types requires I/O – binary blobs
 * are re-typed with `slice()` rather than being read into memory.
 */
export function convertToBlob(input: InputType, options: SaveOptions = {}): Blob {
    // Validates the input and gives every branch below a single source of truth
    // for the resulting MIME type.
    const type = resolveMimeType(input, options);

    // String handling
    if (typeof input === 'string') {
        // Case 1: Data URL with base64 encoding. Checked before `isBase64`
        // because the payload of a data URL is never the raw base64 string.
        const dataUrl = parseDataUrl(input);
        if (dataUrl?.isBase64) {
            return new Blob([decodeBase64(dataUrl.data)], { type });
        }

        // Case 2: Explicit base64 flag
        if (options.isBase64) {
            return new Blob([decodeBase64(input)], { type });
        }

        // Case 3: Plain string (incl. non-base64 data URLs, saved verbatim)
        return new Blob([input], { type });
    }

    // Blob (also File)
    if (input instanceof Blob) {
        if (options.mimeType && options.mimeType !== input.type) {
            // `slice()` re-types the blob without reading its bytes into memory,
            // unlike the `arrayBuffer()` round-trip it replaces.
            return input.slice(0, input.size, options.mimeType);
        }
        return input;
    }

    // ArrayBuffer or TypedArray / DataView
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        return new Blob([input as BlobPart], { type });
    }

    // URLSearchParams
    if (input instanceof URLSearchParams) {
        return new Blob([input.toString()], { type });
    }

    // FormData – binary entries were already rejected by `resolveMimeType`.
    if (input instanceof FormData) {
        const pairs: string[] = [];
        input.forEach((value, key) => {
            pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`);
        });
        return new Blob([pairs.join('&')], { type });
    }

    // Object / Array handling (automatically convert to JSON) – checked last so
    // none of the structured types above are accidentally treated as JSON.
    if (isJsonSerialisable(input)) {
        return new Blob([JSON.stringify(input, null, 2)], { type });
    }

    /* v8 ignore next 2 -- unreachable: resolveMimeType already rejected this input */
    throw unsupportedInputError(input);
}

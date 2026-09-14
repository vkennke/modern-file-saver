import { afterEach, describe, expect, it } from 'vitest';
import { convertToBlob, describeInput, resolveMimeType } from '../../src/utils/blob';

describe('convertToBlob', () => {
    it('should correctly identify and handle different base64 formats', async () => {
        // Pure base64 with isBase64 = true
        const helloWorldBase64 = btoa('Hello World');
        const blob1 = convertToBlob(helloWorldBase64, {
            mimeType: 'text/plain',
            isBase64: true
        });
        expect(await blob1.text()).toBe('Hello World');

        // Pure base64 without isBase64 flag → treated as plain text
        const blob2 = convertToBlob(helloWorldBase64, { mimeType: 'text/plain' });
        expect(await blob2.text()).toBe(helloWorldBase64);

        // Data URL with base64
        const dataUrl = `data:text/plain;base64,${helloWorldBase64}`;
        const blob3 = convertToBlob(dataUrl);
        expect(await blob3.text()).toBe('Hello World');

        expect(blob1.type).toBe(blob2.type);
        expect(blob2.type).toBe(blob3.type);
    });

    it('should handle invalid base64 input gracefully', () => {
        // Invalid base64 string with isBase64 flag
        expect(() => convertToBlob('not-valid-base64!@#', { isBase64: true })).toThrow();

        // Invalid data URL
        expect(() => convertToBlob('data:text/plain;base64,not-valid-base64!@#')).toThrow();
    });

    it('should decode base64 that contains line breaks', async () => {
        const wrapped = btoa('Hello World').replace(/^(.{4})/, '$1\n  ');

        expect(await convertToBlob(wrapped, { isBase64: true }).text()).toBe('Hello World');
        expect(await convertToBlob(`data:text/plain;base64,${wrapped}`).text()).toBe('Hello World');
    });

    describe('base64 decoder fallback', () => {
        const nativeDecoder = (Uint8Array as unknown as Record<string, unknown>).fromBase64;

        afterEach(() => {
            if (nativeDecoder) {
                (Uint8Array as unknown as Record<string, unknown>).fromBase64 = nativeDecoder;
            } else {
                delete (Uint8Array as unknown as Record<string, unknown>).fromBase64;
            }
        });

        it('should use atob when the engine has no native base64 decoder', async () => {
            delete (Uint8Array as unknown as Record<string, unknown>).fromBase64;

            expect(await convertToBlob(btoa('Hello World'), { isBase64: true }).text()).toBe(
                'Hello World'
            );
            expect(() => convertToBlob('!!invalid!!', { isBase64: true })).toThrow();
        });

        it('should use atob when the native decoder rejects the input', async () => {
            (Uint8Array as unknown as Record<string, unknown>).fromBase64 = () => {
                throw new SyntaxError('too strict');
            };

            expect(await convertToBlob(btoa('Hello World'), { isBase64: true }).text()).toBe(
                'Hello World'
            );
        });
    });

    it('should handle large base64 strings', () => {
        // Generate a large string (1MB)
        const largeBase64 = btoa('A'.repeat(1024 * 1024));

        const blob = convertToBlob(largeBase64, { isBase64: true });
        expect(blob.size).toBe(1024 * 1024);
    });

    it('should handle MIME type conflicts in data URLs', () => {
        const dataUrl = `data:text/plain;base64,${btoa('Hello World')}`;

        // Override MIME type
        const blob = convertToBlob(dataUrl, { mimeType: 'application/json' });
        expect(blob.type).toBe('application/json');
    });

    describe('data URLs', () => {
        it('should decode data URLs whose media type carries parameters', async () => {
            const dataUrl = `data:text/plain;charset=utf-8;base64,${btoa('Hello World')}`;

            const blob = convertToBlob(dataUrl);

            expect(await blob.text()).toBe('Hello World');
            // The charset parameter is preserved in the resulting blob type.
            expect(blob.type).toBe('text/plain;charset=utf-8');
        });

        it('should decode canvas-style image data URLs', async () => {
            // 1x1 transparent GIF
            const dataUrl =
                'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

            const blob = convertToBlob(dataUrl);

            expect(blob.type).toBe('image/gif');
            expect(blob.size).toBeGreaterThan(0);
            const bytes = new Uint8Array(await blob.arrayBuffer());
            expect(String.fromCharCode(...bytes.slice(0, 3))).toBe('GIF');
        });

        it('should default to octet-stream when the data URL omits a media type', async () => {
            const blob = convertToBlob(`data:;base64,${btoa('Hello')}`);

            expect(blob.type).toBe('application/octet-stream');
            expect(await blob.text()).toBe('Hello');
        });

        it('should strip the data URL prefix when isBase64 is also set', async () => {
            const blob = convertToBlob(`data:text/plain;base64,${btoa('Hello')}`, {
                isBase64: true
            });

            expect(await blob.text()).toBe('Hello');
        });

        it('should treat non-base64 data URLs as plain text', async () => {
            const blob = convertToBlob('data:text/plain,Hello World');

            expect(blob.type).toBe('text/plain');
            expect(await blob.text()).toBe('data:text/plain,Hello World');
        });

        it('should treat a malformed data URL without a comma as plain text', async () => {
            const blob = convertToBlob('data:text/plain;base64');

            expect(blob.type).toBe('text/plain');
            expect(await blob.text()).toBe('data:text/plain;base64');
        });

        it('should not mistake a ";base64," substring in the payload for an encoding marker', async () => {
            const blob = convertToBlob('data:text/plain,hello;base64,world');

            expect(await blob.text()).toBe('data:text/plain,hello;base64,world');
        });
    });

    it('should handle URLSearchParams input', async () => {
        const params = new URLSearchParams({ name: 'test', value: '123' });
        const blob = convertToBlob(params);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/x-www-form-urlencoded');
        expect(await blob.text()).toBe('name=test&value=123');
    });

    it('should respect mimeType override for URLSearchParams', () => {
        const blob = convertToBlob(new URLSearchParams({ a: '1' }), { mimeType: 'text/plain' });
        expect(blob.type).toBe('text/plain');
    });

    it('should handle FormData input as x-www-form-urlencoded', async () => {
        const formData = new FormData();
        formData.append('name', 'test');
        formData.append('value', '123');

        const blob = convertToBlob(formData);

        expect(blob).toBeInstanceOf(Blob);
        // FormData is serialised as urlencoded – the MIME type reflects that.
        expect(blob.type).toBe('application/x-www-form-urlencoded');

        const text = await blob.text();
        expect(text).toContain('name=test');
        expect(text).toContain('value=123');
    });

    it('should respect mimeType override for FormData', () => {
        const formData = new FormData();
        formData.append('a', '1');
        expect(convertToBlob(formData, { mimeType: 'text/csv' }).type).toBe('text/csv');
    });

    it('should handle plain string input', async () => {
        const blob = convertToBlob('Hello World');

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('text/plain');
        expect(await blob.text()).toBe('Hello World');
    });

    describe('Blob input', () => {
        it('should respect provided MIME type', async () => {
            const input = new Blob(['{"text":"Hello World"}'], { type: 'text/plain' });
            const blob = convertToBlob(input, { mimeType: 'application/json' });

            expect(blob).toBeInstanceOf(Blob);
            expect(blob.type).toBe('application/json');
            expect(await blob.text()).toBe('{"text":"Hello World"}');
        });

        it('should return the very same instance when no re-typing is needed', () => {
            const input = new Blob(['x'], { type: 'text/plain' });

            expect(convertToBlob(input)).toBe(input);
            expect(convertToBlob(input, { mimeType: 'text/plain' })).toBe(input);
        });

        it('should preserve content and size when re-typing a large blob', async () => {
            const input = new Blob([new Uint8Array(1024 * 1024).fill(65)], {
                type: 'application/octet-stream'
            });

            const blob = convertToBlob(input, { mimeType: 'text/plain' });

            expect(blob.type).toBe('text/plain');
            expect(blob.size).toBe(input.size);
            expect((await blob.text()).startsWith('AAAA')).toBe(true);
        });

        it('should keep a File instance untouched', () => {
            const file = new File(['x'], 'a.txt', { type: 'text/plain' });
            expect(convertToBlob(file)).toBe(file);
        });
    });

    it('should handle arrays as JSON', async () => {
        const blob = convertToBlob([1, 2, 3]);
        expect(blob.type).toBe('application/json');
        expect(JSON.parse(await blob.text())).toEqual([1, 2, 3]);
    });

    it('should serialise class instances that carry own enumerable data', async () => {
        class Point {
            constructor(
                public x: number,
                public y: number
            ) {}
        }

        const blob = convertToBlob(new Point(1, 2) as unknown as Record<string, unknown>);
        expect(JSON.parse(await blob.text())).toEqual({ x: 1, y: 2 });
    });

    it('should handle ArrayBuffer and DataView input', () => {
        const buffer = new TextEncoder().encode('Hello').buffer;

        expect(convertToBlob(buffer).type).toBe('application/octet-stream');
        expect(convertToBlob(buffer).size).toBe(5);
        expect(convertToBlob(new DataView(buffer)).size).toBe(5);
    });

    describe('error handling', () => {
        it('should handle string FormData values', async () => {
            const formData = new FormData();
            formData.append('emptyValue', '');
            formData.append('value', 'x');

            const text = await convertToBlob(formData).text();
            expect(text).toContain('emptyValue=');
            expect(text).toContain('value=x');
        });

        it('should reject FormData containing a File', () => {
            const formData = new FormData();
            formData.append('name', 'test');
            formData.append('upload', new File(['hello'], 'cv.pdf', { type: 'application/pdf' }));

            expect(() => convertToBlob(formData)).toThrow(/File "cv\.pdf".*x-www-form-urlencoded/);
        });

        it('should reject FormData containing a Blob (browsers wrap it as File "blob")', () => {
            // Per the WHATWG XHR spec, FormData.append(name, Blob) materialises
            // the Blob as a File with name "blob". We surface that to the caller
            // rather than silently corrupting the output.
            const formData = new FormData();
            formData.append(
                'binary',
                new Blob(['raw bytes'], { type: 'application/octet-stream' })
            );

            expect(() => convertToBlob(formData)).toThrow(/File "blob".*x-www-form-urlencoded/);
        });

        it('should handle circular references in objects', () => {
            const circular: any = { name: 'test' };
            circular.self = circular;

            expect(() => convertToBlob(circular)).toThrow();
        });

        it('should reject unsupported input types', () => {
            expect(() => convertToBlob(Symbol('x') as any)).toThrow(/Unsupported input type/);
            expect(() => convertToBlob(123 as any)).toThrow(/Unsupported input type: number/);
            expect(() => convertToBlob(null as any)).toThrow(/Unsupported input type: null/);
            expect(() => convertToBlob(undefined as any)).toThrow(/Unsupported input type/);
            expect(() => convertToBlob(new Date() as any)).toThrow(/Unsupported input type: Date/);
            expect(() => convertToBlob(new Map() as any)).toThrow(/Unsupported input type: Map/);
            expect(() => convertToBlob(new Set() as any)).toThrow(/Unsupported input type: Set/);
        });

        it('should reject objects that would silently serialise to an empty file', () => {
            // These all stringify to "{}" because their state lives in
            // non-enumerable properties or internal slots.
            expect(() => convertToBlob(new Error('boom') as any)).toThrow(
                /Unsupported input type: Error/
            );
            expect(() => convertToBlob(Promise.resolve(1) as any)).toThrow(
                /Unsupported input type: Promise/
            );
            expect(() => convertToBlob(/abc/g as any)).toThrow(/Unsupported input type: RegExp/);
            expect(() => convertToBlob(new WeakMap() as any)).toThrow(
                /Unsupported input type: WeakMap/
            );
        });

        it('should still accept an empty plain object and a null-prototype object', async () => {
            expect(await convertToBlob({}).text()).toBe('{}');
            expect(await convertToBlob(Object.assign(Object.create(null), { a: 1 })).text()).toBe(
                '{\n  "a": 1\n}'
            );
        });
    });

    describe('performance', () => {
        it('should handle very large strings', () => {
            // 10MB string
            const blob = convertToBlob('A'.repeat(10 * 1024 * 1024));
            expect(blob.size).toBe(10 * 1024 * 1024);
        });

        it('should handle large typed arrays', () => {
            // 10MB array
            const blob = convertToBlob(new Uint8Array(10 * 1024 * 1024).fill(65));
            expect(blob.size).toBe(10 * 1024 * 1024);
        });
    });
});

describe('resolveMimeType', () => {
    it('should resolve the same type the conversion produces', () => {
        const cases: [unknown, Record<string, unknown>][] = [
            ['plain', {}],
            [btoa('x'), { isBase64: true }],
            [`data:text/csv;base64,${btoa('a,b')}`, {}],
            [new URLSearchParams({ a: '1' }), {}],
            [{ a: 1 }, {}],
            [[1, 2], {}],
            [new Uint8Array([1]), {}],
            [new Blob(['x'], { type: 'text/html' }), {}],
            ['plain', { mimeType: 'text/markdown' }]
        ];

        for (const [input, options] of cases) {
            expect(resolveMimeType(input as never, options)).toBe(
                convertToBlob(input as never, options).type
            );
        }
    });

    it('should fall back to octet-stream for a type-less blob', () => {
        expect(resolveMimeType(new Blob(['x']))).toBe('application/octet-stream');
    });

    it('should validate the input before any save dialog is opened', () => {
        const formData = new FormData();
        formData.append('upload', new File(['x'], 'a.bin'));

        expect(() => resolveMimeType(formData)).toThrow(/x-www-form-urlencoded/);
        expect(() => resolveMimeType(123 as never)).toThrow(/Unsupported input type/);
    });
});

describe('describeInput', () => {
    it('should name the input type for diagnostics', () => {
        expect(describeInput(null)).toBe('null');
        expect(describeInput(undefined)).toBe('undefined');
        expect(describeInput('x')).toBe('string');
        expect(describeInput(1)).toBe('number');
        expect(describeInput({})).toBe('Object');
        expect(describeInput([])).toBe('Array');
        expect(describeInput(new Blob([]))).toBe('Blob');
        expect(describeInput(Object.create(null))).toBe('object');
    });
});

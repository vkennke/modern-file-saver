import { describe, expect, it } from 'vitest';
import { convertToBlob } from '../../src/utils/blob';

describe('convertToBlob', () => {
    it('should correctly identify and handle different base64 formats', async () => {
        // Pure base64 with isBase64 = true
        const helloWorldBase64 = btoa('Hello World');
        const blob1 = await convertToBlob(helloWorldBase64, {
            mimeType: 'text/plain',
            isBase64: true
        });
        const text1 = await blob1.text();
        expect(text1).toBe('Hello World');

        // Pure base64 without isBase64 flag → treated as plain text
        const blob2 = await convertToBlob(helloWorldBase64, { mimeType: 'text/plain' });
        const text2 = await blob2.text();
        expect(text2).toBe(helloWorldBase64);

        // Data URL with base64
        const dataUrl = `data:text/plain;base64,${helloWorldBase64}`;
        const blob3 = await convertToBlob(dataUrl);
        const text3 = await blob3.text();
        expect(text3).toBe('Hello World');

        expect(blob1.type).toBe(blob2.type);
        expect(blob2.type).toBe(blob3.type);
    });

    it('should handle invalid base64 input gracefully', async () => {
        // Invalid base64 string with isBase64 flag
        const invalidBase64 = 'not-valid-base64!@#';
        await expect(convertToBlob(invalidBase64, { isBase64: true })).rejects.toThrow();

        // Invalid data URL
        const invalidDataUrl = 'data:text/plain;base64,not-valid-base64!@#';
        await expect(convertToBlob(invalidDataUrl)).rejects.toThrow();
    });

    it('should handle large base64 strings', async () => {
        // Generate a large string (1MB)
        const largeString = 'A'.repeat(1024 * 1024);
        const largeBase64 = btoa(largeString);

        const blob = await convertToBlob(largeBase64, { isBase64: true });
        expect(blob.size).toBe(1024 * 1024);
    });

    it('should handle MIME type conflicts in data URLs', async () => {
        const base64 = btoa('Hello World');
        const dataUrl = `data:text/plain;base64,${base64}`;

        // Override MIME type
        const blob = await convertToBlob(dataUrl, { mimeType: 'application/json' });
        expect(blob.type).toBe('application/json');
    });

    it('should handle URLSearchParams input', async () => {
        const params = new URLSearchParams({ name: 'test', value: '123' });
        const blob = await convertToBlob(params);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/x-www-form-urlencoded');

        const text = await blob.text();
        expect(text).toBe('name=test&value=123');
    });

    it('should respect mimeType override for URLSearchParams', async () => {
        const params = new URLSearchParams({ a: '1' });
        const blob = await convertToBlob(params, { mimeType: 'text/plain' });
        expect(blob.type).toBe('text/plain');
    });

    it('should handle FormData input as x-www-form-urlencoded', async () => {
        const formData = new FormData();
        formData.append('name', 'test');
        formData.append('value', '123');

        const blob = await convertToBlob(formData);

        expect(blob).toBeInstanceOf(Blob);
        // FormData is serialised as urlencoded – the MIME type reflects that.
        expect(blob.type).toBe('application/x-www-form-urlencoded');

        const text = await blob.text();
        expect(text).toContain('name=test');
        expect(text).toContain('value=123');
    });

    it('should respect mimeType override for FormData', async () => {
        const formData = new FormData();
        formData.append('a', '1');
        const blob = await convertToBlob(formData, { mimeType: 'text/csv' });
        expect(blob.type).toBe('text/csv');
    });

    it('should handle plain string input', async () => {
        const input = 'Hello World';
        const blob = await convertToBlob(input);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('text/plain');

        const text = await blob.text();
        expect(text).toBe('Hello World');
    });

    it('should respect provided MIME type', async () => {
        const input = new Blob(['{"text":"Hello World"}'], { type: 'text/plain' });
        const blob = await convertToBlob(input, { mimeType: 'application/json' });

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');
        const text = await blob.text();
        expect(text).toBe('{"text":"Hello World"}');
    });

    it('should handle arrays as JSON', async () => {
        const blob = await convertToBlob([1, 2, 3]);
        expect(blob.type).toBe('application/json');
        expect(JSON.parse(await blob.text())).toEqual([1, 2, 3]);
    });

    describe('error handling', () => {
        it('should handle string FormData values', async () => {
            const formData = new FormData();
            formData.append('emptyValue', '');
            formData.append('value', 'x');

            const blob = await convertToBlob(formData);
            const text = await blob.text();
            expect(text).toContain('emptyValue=');
            expect(text).toContain('value=x');
        });

        it('should reject FormData containing a File', async () => {
            const formData = new FormData();
            formData.append('name', 'test');
            formData.append('upload', new File(['hello'], 'cv.pdf', { type: 'application/pdf' }));

            await expect(convertToBlob(formData)).rejects.toThrow(
                /File "cv\.pdf".*x-www-form-urlencoded/
            );
        });

        it('should reject FormData containing a Blob (browsers wrap it as File "blob")', async () => {
            // Per the WHATWG XHR spec, FormData.append(name, Blob) materialises
            // the Blob as a File with name "blob". We surface that to the caller
            // rather than silently corrupting the output.
            const formData = new FormData();
            formData.append(
                'binary',
                new Blob(['raw bytes'], { type: 'application/octet-stream' })
            );

            await expect(convertToBlob(formData)).rejects.toThrow(
                /File "blob".*x-www-form-urlencoded/
            );
        });

        it('should handle circular references in objects', async () => {
            const circular: any = { name: 'test' };
            circular.self = circular;

            await expect(convertToBlob(circular)).rejects.toThrow();
        });

        it('should reject unsupported input types', async () => {
            await expect(convertToBlob(Symbol('x') as any)).rejects.toThrow();
            await expect(convertToBlob(123 as any)).rejects.toThrow();
            await expect(convertToBlob(null as any)).rejects.toThrow();
        });
    });

    describe('performance', () => {
        it('should handle very large strings', async () => {
            // 10MB string
            const largeString = 'A'.repeat(10 * 1024 * 1024);
            const blob = await convertToBlob(largeString);
            expect(blob.size).toBe(10 * 1024 * 1024);
        });

        it('should handle large typed arrays', async () => {
            // 10MB array
            const largeArray = new Uint8Array(10 * 1024 * 1024).fill(65); // 'A'
            const blob = await convertToBlob(largeArray);
            expect(blob.size).toBe(10 * 1024 * 1024);
        });
    });
});

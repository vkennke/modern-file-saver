import {convertToBlob} from '../../src/utils/blob';

describe('convertToBlob', () => {
    it('should correctly identify and handle different base64 formats', async () => {
        // Pure base64
        const pureBase64 = btoa('Hello World');
        const blob1 = await convertToBlob(pureBase64, {mimeType: 'text/plain'});
        const text1 = await blob1.text();
        expect(text1).toBe('Hello World');

        // Data URL with base64
        const dataUrl = `data:text/plain;base64,${btoa('Hello World')}`;
        const blob2 = await convertToBlob(dataUrl);
        const text2 = await blob2.text();
        expect(text2).toBe('Hello World');

        expect(blob1.type).toBe(blob2.type);
    });

    it('should handle URLSearchParams input', async () => {
        const params = new URLSearchParams({
            name: 'test',
            value: '123'
        });
        const blob = await convertToBlob(params);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/x-www-form-urlencoded');

        const text = await blob.text();
        expect(text).toBe('name=test&value=123');
    });

    it('should handle FormData input', async () => {
        const formData = new FormData();
        formData.append('name', 'test');
        formData.append('value', '123');

        const blob = await convertToBlob(formData);

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('multipart/form-data');

        const text = await blob.text();
        expect(text).toContain('name=test');
        expect(text).toContain('value=123');
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
        const input = new Blob(['{"text":"Hello World"}'], {
            type: 'text/plain'
        });
        const blob = await convertToBlob(input, { mimeType: 'application/json' });

        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe('application/json');
        const text = await blob.text();
        expect(text).toBe('{"text":"Hello World"}');
    });
});
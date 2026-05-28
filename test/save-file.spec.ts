import { saveFile } from '../src';

describe('saveFile', () => {
    let mockLink: HTMLAnchorElement;
    let linkClickSpy: jasmine.Spy;
    let createObjectURLSpy: jasmine.Spy;

    beforeEach(() => {
        // Setup for link fallback mechanism
        linkClickSpy = jasmine.createSpy('link.click');
        mockLink = {
            style: {},
            href: '',
            download: '',
            click: linkClickSpy,
            nodeType: 1, // Needed for Node interface
            parentNode: document.body
        } as unknown as HTMLAnchorElement;

        spyOn(document, 'createElement').and.returnValue(mockLink);
        createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
        spyOn(URL, 'revokeObjectURL');
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');
    });

    it('should use link fallback in Firefox', async () => {
        // Firefox doesn't have showSaveFilePicker
        if ('showSaveFilePicker' in window) {
            pending('This test is for browsers without File System Access API');
            return;
        }

        await saveFile('test content', { fileName: 'test.txt', logLevel: 'debug' });

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(linkClickSpy).toHaveBeenCalled();
        // Cleanup is now awaited – no fake clock tick needed.
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
        expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should respect promptSaveAs option and use fallback', async () => {
        await saveFile('test content', {
            fileName: 'test.txt',
            promptSaveAs: false, // Force fallback mechanism
            logLevel: 'debug'
        });

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(linkClickSpy).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should try to use File System Access API in Chrome', async () => {
        // Skip in Firefox
        if (!('showSaveFilePicker' in window)) {
            pending('Test requires File System Access API support');
            return;
        }

        const showSaveFilePickerSpy = spyOn(window, 'showSaveFilePicker').and.rejectWith(
            new Error('Test rejection') // non-AbortError -> falls back
        );

        await saveFile('test content', {
            fileName: 'test.txt',
            promptSaveAs: true,
            logLevel: 'debug'
        });

        expect(showSaveFilePickerSpy).toHaveBeenCalled();
        expect(linkClickSpy).toHaveBeenCalled(); // Fallback should be called after API error
    });

    it('should re-throw AbortError when user cancels the save dialog', async () => {
        if (!('showSaveFilePicker' in window)) {
            pending('Test requires File System Access API support');
            return;
        }

        const abortError = new Error('User aborted');
        abortError.name = 'AbortError';
        spyOn(window, 'showSaveFilePicker').and.rejectWith(abortError);

        await expectAsync(
            saveFile('test content', { fileName: 'test.txt', promptSaveAs: true })
        ).toBeRejectedWith(abortError);

        // Fallback must NOT run when the user explicitly cancelled.
        expect(linkClickSpy).not.toHaveBeenCalled();
    });

    it('should use File name when no fileName option is provided', async () => {
        const testFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });

        await saveFile(testFile, { promptSaveAs: false });

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('test-file.txt');
    });

    it('should allow overriding File name with fileName option', async () => {
        const testFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });

        await saveFile(testFile, { fileName: 'override.txt', promptSaveAs: false });

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('override.txt');
    });

    it('should convert object input to JSON', async () => {
        const testObject = { name: 'Test', value: 123 };

        await saveFile(testObject, { fileName: 'test.json', promptSaveAs: false });

        expect(mockLink.download).toBe('test.json');
        expect(createObjectURLSpy).toHaveBeenCalledWith(jasmine.any(Blob));

        const blob = createObjectURLSpy.calls.mostRecent().args[0] as Blob;
        expect(blob.type).toBe('application/json');
        const content = await blob.text();
        expect(JSON.parse(content)).toEqual(testObject);
    });

    describe('File System Access API errors', () => {
        it('should handle permission denied errors', async () => {
            if (!('showSaveFilePicker' in window)) {
                pending('Test requires File System Access API support');
                return;
            }

            const error = new Error('Permission denied');
            error.name = 'NotAllowedError';

            spyOn(window, 'showSaveFilePicker').and.rejectWith(error);

            // Should fall back to legacy method
            await saveFile('test content', {
                fileName: 'test.txt',
                logLevel: 'debug'
            });

            expect(linkClickSpy).toHaveBeenCalled();
        });

        it('should handle security errors', async () => {
            if (!('showSaveFilePicker' in window)) {
                pending('Test requires File System Access API support');
                return;
            }

            const error = new Error('Security Error');
            error.name = 'SecurityError';

            spyOn(window, 'showSaveFilePicker').and.rejectWith(error);

            // Should fall back to legacy method
            await saveFile('test content', {
                fileName: 'test.txt',
                logLevel: 'debug'
            });

            expect(linkClickSpy).toHaveBeenCalled();
        });
    });

    describe('cleanup and error handling', () => {
        it('should clean up the object URL after a successful fallback save', async () => {
            await saveFile('test content', { promptSaveAs: false });

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(document.body.removeChild).toHaveBeenCalled();
        });

        it('should propagate convertToBlob errors', async () => {
            // Unsupported input – the new convertToBlob throws for symbols/functions etc.
            await expectAsync(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                saveFile(Symbol('x') as any, { promptSaveAs: false })
            ).toBeRejected();
            expect(linkClickSpy).not.toHaveBeenCalled();
        });

        it('should clean up after saving large files', async () => {
            // 10MB string
            const largeContent = 'A'.repeat(10 * 1024 * 1024);
            await saveFile(largeContent, { promptSaveAs: false });

            expect(URL.revokeObjectURL).toHaveBeenCalled();
            expect(document.body.removeChild).toHaveBeenCalled();
        });
    });
});

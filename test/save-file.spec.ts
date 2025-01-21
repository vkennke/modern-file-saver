import { saveFile } from '../src';

describe('saveFile', () => {
    let mockLink: HTMLAnchorElement;
    let linkClickSpy: jasmine.Spy;
    let createObjectURLSpy: jasmine.Spy;

    beforeEach(() => {
        jasmine.clock().install();

        // Setup for link fallback mechanism
        linkClickSpy = jasmine.createSpy('link.click');
        mockLink = {
            style: {},
            href: '',
            download: '',
            click: linkClickSpy,
            nodeType: 1 // Needed for Node interface
        } as unknown as HTMLAnchorElement;

        spyOn(document, 'createElement').and.returnValue(mockLink);
        createObjectURLSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
        spyOn(URL, 'revokeObjectURL');
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');
    });

    afterEach(() => {
        jasmine.clock().uninstall();
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

        jasmine.clock().tick(100);
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should respect promptSaveAs option and use fallback', async () => {
        await saveFile('test content', {
            fileName: 'test.txt',
            promptSaveAs: false, // Force fallback mechanism
            logLevel: 'debug'
        });

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(linkClickSpy).toHaveBeenCalled();
    });

    it('should try to use File System Access API in Chrome', async () => {
        // Skip in Firefox
        if (!('showSaveFilePicker' in window)) {
            pending('Test requires File System Access API support');
            return;
        }

        const showSaveFilePickerSpy = spyOn(window, 'showSaveFilePicker').and.rejectWith(
            new Error('Test aborted')
        ); // Simulate abort to prevent test from hanging

        await saveFile('test content', {
            fileName: 'test.txt',
            promptSaveAs: true,
            logLevel: 'debug'
        });

        expect(showSaveFilePickerSpy).toHaveBeenCalled();
        expect(linkClickSpy).toHaveBeenCalled(); // Fallback should be called after API error
    });

    it('should use File name when no fileName option is provided', async () => {
        const testFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });

        await saveFile(testFile);

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('test-file.txt');
    });

    it('should allow overriding File name with fileName option', async () => {
        const testFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });

        await saveFile(testFile, { fileName: 'override.txt' });

        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockLink.download).toBe('override.txt');
    });

    it('should convert object input to JSON', async () => {
        const testObject = {
            name: 'Test',
            value: 123
        };

        createObjectURLSpy.and.callFake(blob => {
            // Verify that the blob contains stringified JSON
            if (blob instanceof Blob) {
                blob.text().then(content => {
                    const parsed = JSON.parse(content);
                    expect(parsed).toEqual(testObject);
                });
            }
            return 'blob:mock-url';
        });

        await saveFile(testObject, { fileName: 'test.json' });

        expect(mockLink.download).toBe('test.json');
        // Verify that correct MIME type is set
        expect(createObjectURLSpy).toHaveBeenCalledWith(jasmine.any(Blob));

        const blob = createObjectURLSpy.calls.mostRecent().args[0];
        if (blob instanceof Blob) {
            expect(blob.type).toBe('application/json');
        }
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
        it('should clean up resources on error', async () => {
            // Skip if File System Access API is not available
            if (!('showSaveFilePicker' in window)) {
                pending('Test requires File System Access API support');
                return;
            }

            spyOn(window, 'showSaveFilePicker').and.rejectWith(new Error('Test error'));

            try {
                await saveFile('test content', { promptSaveAs: true });
            } catch (error) {
                // Should still clean up
                expect(URL.revokeObjectURL).toHaveBeenCalled();
                expect(document.body.removeChild).toHaveBeenCalled();
            }
        });

        it('should clean up after saving large files', async () => {
            // 10MB string
            const largeContent = 'A'.repeat(10 * 1024 * 1024);
            await saveFile(largeContent, { promptSaveAs: false });

            jasmine.clock().tick(100);

            expect(URL.revokeObjectURL).toHaveBeenCalled();
            expect(document.body.removeChild).toHaveBeenCalled();
        });
    });
});

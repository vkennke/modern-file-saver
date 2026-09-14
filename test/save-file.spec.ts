import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { saveFile } from '../src';

const hasFileSystemAccess = 'showSaveFilePicker' in window;

interface MockWritable {
    write: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    abort: ReturnType<typeof vi.fn>;
}

describe('saveFile', () => {
    let mockLink: HTMLAnchorElement;
    let linkClickSpy: ReturnType<typeof vi.fn>;
    let createObjectURLSpy: MockInstance<typeof URL.createObjectURL>;

    /** Install a picker that resolves to a writable capturing everything written. */
    function mockPicker(): { writable: MockWritable; written: Blob[] } {
        const written: Blob[] = [];
        const writable: MockWritable = {
            write: vi.fn((blob: Blob) => {
                written.push(blob);
                return Promise.resolve();
            }),
            close: vi.fn().mockResolvedValue(undefined),
            abort: vi.fn().mockResolvedValue(undefined)
        };
        vi.spyOn(window, 'showSaveFilePicker').mockResolvedValue({
            createWritable: vi.fn().mockResolvedValue(writable)
        } as unknown as FileSystemFileHandle);
        return { writable, written };
    }

    beforeEach(() => {
        // Setup for link fallback mechanism
        linkClickSpy = vi.fn();
        mockLink = {
            style: {},
            href: '',
            download: '',
            click: linkClickSpy,
            nodeType: 1, // Needed for Node interface
            parentNode: document.body
        } as unknown as HTMLAnchorElement;

        // Only intercept anchors – other elements must still be created normally
        // so the test runner's own DOM usage keeps working.
        const createElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation(
            (...args: Parameters<typeof document.createElement>) =>
                args[0] === 'a' ? mockLink : createElement(...args)
        );
        createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
        vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {
            /* noop */
        });
        vi.spyOn(document.body, 'appendChild').mockImplementation(
            <T extends Node>(node: T) => node
        );
        vi.spyOn(document.body, 'removeChild').mockImplementation(
            <T extends Node>(node: T) => node
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it.skipIf(hasFileSystemAccess)('should use link fallback in Firefox', async () => {
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

    it.skipIf(!hasFileSystemAccess)(
        'should try to use File System Access API in Chrome',
        async () => {
            const showSaveFilePickerSpy = vi
                .spyOn(window, 'showSaveFilePicker')
                .mockRejectedValue(new Error('Test rejection')); // non-AbortError -> falls back

            await saveFile('test content', {
                fileName: 'test.txt',
                promptSaveAs: true,
                logLevel: 'debug'
            });

            expect(showSaveFilePickerSpy).toHaveBeenCalled();
            expect(linkClickSpy).toHaveBeenCalled(); // Fallback should be called after API error
        }
    );

    it.skipIf(!hasFileSystemAccess)(
        'should re-throw AbortError when user cancels the save dialog',
        async () => {
            const abortError = new Error('User aborted');
            abortError.name = 'AbortError';
            vi.spyOn(window, 'showSaveFilePicker').mockRejectedValue(abortError);

            await expect(
                saveFile('test content', { fileName: 'test.txt', promptSaveAs: true })
            ).rejects.toBe(abortError);

            // Fallback must NOT run when the user explicitly cancelled.
            expect(linkClickSpy).not.toHaveBeenCalled();
        }
    );

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
        expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));

        const blob = createObjectURLSpy.mock.calls.at(-1)![0] as Blob;
        expect(blob.type).toBe('application/json');
        expect(JSON.parse(await blob.text())).toEqual(testObject);
    });

    describe.skipIf(!hasFileSystemAccess)('File System Access API', () => {
        it('should write the converted blob and close the writable', async () => {
            const { writable, written } = mockPicker();

            await saveFile({ name: 'Test' }, { fileName: 'data.json' });

            expect(written).toHaveLength(1);
            expect(written[0]!.type).toBe('application/json');
            expect(JSON.parse(await written[0]!.text())).toEqual({ name: 'Test' });
            expect(writable.close).toHaveBeenCalled();
            expect(writable.abort).not.toHaveBeenCalled();
            // No anchor fallback and no object URL when the picker succeeded.
            expect(linkClickSpy).not.toHaveBeenCalled();
            expect(URL.createObjectURL).not.toHaveBeenCalled();
        });

        it('should pass the resolved MIME type and extension to the picker', async () => {
            mockPicker();

            await saveFile('a,b', { fileName: 'export.csv', mimeType: 'text/csv' });

            expect(window.showSaveFilePicker).toHaveBeenCalledWith({
                suggestedName: 'export.csv',
                types: [{ description: 'File', accept: { 'text/csv': ['.csv'] } }]
            });
        });

        it('should open the picker before converting the input', async () => {
            const order: string[] = [];
            vi.spyOn(window, 'showSaveFilePicker').mockImplementation(() => {
                order.push('picker');
                return Promise.resolve({
                    createWritable: vi.fn().mockResolvedValue({
                        write: vi.fn(() => {
                            order.push('write');
                            return Promise.resolve();
                        }),
                        close: vi.fn().mockResolvedValue(undefined),
                        abort: vi.fn().mockResolvedValue(undefined)
                    })
                } as unknown as FileSystemFileHandle);
            });

            await saveFile({ a: 1 }, { fileName: 'a.json' });

            // Serialising before the dialog would risk expiring the transient
            // user activation the File System Access API requires.
            expect(order).toEqual(['picker', 'write']);
        });

        it('should reject unsupported input before opening the save dialog', async () => {
            const pickerSpy = vi.spyOn(window, 'showSaveFilePicker');

            await expect(saveFile(123 as never)).rejects.toThrow(/Unsupported input type/);

            expect(pickerSpy).not.toHaveBeenCalled();
            expect(linkClickSpy).not.toHaveBeenCalled();
        });

        it('should reject binary FormData before opening the save dialog', async () => {
            const pickerSpy = vi.spyOn(window, 'showSaveFilePicker');
            const formData = new FormData();
            formData.append('upload', new File(['x'], 'a.bin'));

            await expect(saveFile(formData)).rejects.toThrow(/x-www-form-urlencoded/);

            expect(pickerSpy).not.toHaveBeenCalled();
        });
    });

    describe.skipIf(!hasFileSystemAccess)('File System Access API errors', () => {
        it.each(['NotAllowedError', 'SecurityError'])(
            'should fall back to the legacy method on %s',
            async name => {
                const error = new Error(name);
                error.name = name;
                vi.spyOn(window, 'showSaveFilePicker').mockRejectedValue(error);

                await saveFile('test content', { fileName: 'test.txt', logLevel: 'debug' });

                expect(linkClickSpy).toHaveBeenCalled();
            }
        );

        it('should call writable.abort() and re-throw when write fails', async () => {
            const writeError = new Error('Disk full');
            const abortSpy = vi.fn().mockResolvedValue(undefined);
            const closeSpy = vi.fn().mockResolvedValue(undefined);
            vi.spyOn(window, 'showSaveFilePicker').mockResolvedValue({
                createWritable: vi.fn().mockResolvedValue({
                    write: vi.fn().mockRejectedValue(writeError),
                    abort: abortSpy,
                    close: closeSpy
                })
            } as unknown as FileSystemFileHandle);

            await expect(
                saveFile('test content', { fileName: 'test.txt', promptSaveAs: true })
            ).rejects.toThrow(writeError);

            expect(abortSpy).toHaveBeenCalled();
            expect(closeSpy).not.toHaveBeenCalled();
            // Fallback must NOT run after a write error
            expect(linkClickSpy).not.toHaveBeenCalled();
        });

        it('should keep the original error when abort() also rejects', async () => {
            const writeError = new Error('Disk full');
            vi.spyOn(window, 'showSaveFilePicker').mockResolvedValue({
                createWritable: vi.fn().mockResolvedValue({
                    write: vi.fn().mockRejectedValue(writeError),
                    abort: vi.fn().mockRejectedValue(new Error('abort failed')),
                    close: vi.fn().mockResolvedValue(undefined)
                })
            } as unknown as FileSystemFileHandle);

            await expect(saveFile('test content', { fileName: 'test.txt' })).rejects.toThrow(
                writeError
            );
        });
    });

    describe.skipIf(!hasFileSystemAccess)('logging', () => {
        it('should report the fallback at logLevel "warn" without debug noise', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            vi.spyOn(window, 'showSaveFilePicker').mockRejectedValue(new Error('nope'));

            await saveFile('test content', { fileName: 'test.txt', logLevel: 'warn' });

            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('falling back to legacy method'),
                expect.anything()
            );
            expect(logSpy).not.toHaveBeenCalled();
        });

        it('should stay silent by default', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            vi.spyOn(window, 'showSaveFilePicker').mockRejectedValue(new Error('nope'));

            await saveFile('test content', { fileName: 'test.txt' });

            expect(warnSpy).not.toHaveBeenCalled();
            expect(logSpy).not.toHaveBeenCalled();
        });
    });

    describe('cleanup and error handling', () => {
        it('should clean up the object URL after a successful fallback save', async () => {
            await saveFile('test content', { promptSaveAs: false });

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(document.body.removeChild).toHaveBeenCalled();
        });

        it('should settle even when requestAnimationFrame never fires', async () => {
            // rAF is paused in hidden/backgrounded tabs – without a timeout guard
            // the returned promise would hang forever and leak the object URL.
            vi.stubGlobal('requestAnimationFrame', () => 0);

            await saveFile('test content', { promptSaveAs: false });

            expect(linkClickSpy).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(document.body.removeChild).toHaveBeenCalled();
        });

        it('should revoke the object URL even when the click throws', async () => {
            linkClickSpy.mockImplementation(() => {
                throw new Error('click failed');
            });

            await expect(saveFile('test content', { promptSaveAs: false })).rejects.toThrow(
                'click failed'
            );

            expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
            expect(document.body.removeChild).toHaveBeenCalled();
        });

        it('should propagate convertToBlob errors', async () => {
            // Unsupported input – the new convertToBlob throws for symbols/functions etc.
            await expect(saveFile(Symbol('x') as any, { promptSaveAs: false })).rejects.toThrow();
            expect(linkClickSpy).not.toHaveBeenCalled();
            expect(URL.createObjectURL).not.toHaveBeenCalled();
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

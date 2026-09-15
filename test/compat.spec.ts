import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import saveAsDefault, { saveAs } from '../src/compat';

const hasFileSystemAccess = 'showSaveFilePicker' in window;

describe('compat saveAs', () => {
    let mockLink: HTMLAnchorElement;
    let linkClickSpy: ReturnType<typeof vi.fn>;
    let createObjectURLSpy: MockInstance<typeof URL.createObjectURL>;
    let consoleErrorSpy: MockInstance<typeof console.error>;
    let consoleWarnSpy: MockInstance<typeof console.warn>;

    /** Blob handed to `URL.createObjectURL` by the anchor fallback. */
    function savedBlob(): Blob {
        expect(createObjectURLSpy).toHaveBeenCalled();
        return createObjectURLSpy.mock.calls[0]?.[0] as Blob;
    }

    /**
     * Raw bytes of the saved blob. `Blob.text()` runs a UTF-8 decode which
     * *strips* a leading BOM, so BOM assertions have to look at the bytes.
     */
    async function savedBytes(): Promise<number[]> {
        return Array.from(new Uint8Array(await savedBlob().arrayBuffer()));
    }

    /** UTF-8 encoding of "hi", optionally preceded by a BOM. */
    const HI = [0x68, 0x69];
    const BOM = [0xef, 0xbb, 0xbf];

    beforeEach(() => {
        linkClickSpy = vi.fn();
        mockLink = {
            style: {},
            href: '',
            download: '',
            target: '',
            rel: '',
            click: linkClickSpy,
            nodeType: 1,
            parentNode: document.body
        } as unknown as HTMLAnchorElement;

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
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
            /* noop */
        });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
            /* noop */
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    describe('API shape', () => {
        it('exposes the same function as named, default and nested export', () => {
            expect(saveAsDefault).toBe(saveAs);
            expect(saveAs.saveAs).toBe(saveAs);
        });
    });

    describe('blob input', () => {
        it('saves a blob without showing the native dialog by default', async () => {
            const pickerSpy = hasFileSystemAccess
                ? vi.spyOn(window, 'showSaveFilePicker')
                : undefined;

            await saveAs(new Blob(['hello'], { type: 'text/plain' }), 'hello.txt');

            expect(linkClickSpy).toHaveBeenCalled();
            expect(mockLink.download).toBe('hello.txt');
            expect(mockLink.rel).toBe('');
            expect(pickerSpy?.mock.calls ?? []).toHaveLength(0);
            expect(await savedBlob().text()).toBe('hello');
        });

        it('falls back to the File name when no filename is given', async () => {
            await saveAs(new File(['x'], 'from-file.txt', { type: 'text/plain' }));

            expect(mockLink.download).toBe('from-file.txt');
        });

        it('falls back to "download" for a nameless blob', async () => {
            await saveAs(new Blob(['x']));

            expect(mockLink.download).toBe('download');
        });

        it.skipIf(!hasFileSystemAccess)(
            'uses the native dialog when promptSaveAs is enabled',
            async () => {
                const write = vi.fn().mockResolvedValue(undefined);
                vi.spyOn(window, 'showSaveFilePicker').mockResolvedValue({
                    createWritable: vi.fn().mockResolvedValue({
                        write,
                        close: vi.fn().mockResolvedValue(undefined),
                        abort: vi.fn().mockResolvedValue(undefined)
                    })
                } as unknown as FileSystemFileHandle);

                await saveAs(new Blob(['x'], { type: 'text/plain' }), 'x.txt', {
                    promptSaveAs: true
                });

                expect(window.showSaveFilePicker).toHaveBeenCalled();
                expect(write).toHaveBeenCalled();
                expect(linkClickSpy).not.toHaveBeenCalled();
            }
        );
    });

    describe('autoBom', () => {
        it('prepends a BOM for UTF-8 text when enabled', async () => {
            await saveAs(new Blob(['hi'], { type: 'text/plain;charset=utf-8' }), 'hi.txt', {
                autoBom: true
            });

            expect(await savedBytes()).toEqual([...BOM, ...HI]);
        });

        it('does not prepend a BOM by default', async () => {
            await saveAs(new Blob(['hi'], { type: 'text/plain;charset=utf-8' }), 'hi.txt');

            expect(await savedBytes()).toEqual(HI);
        });

        it('does not prepend a BOM for non-utf-8 types', async () => {
            await saveAs(new Blob(['hi'], { type: 'application/octet-stream' }), 'hi.bin', {
                autoBom: true
            });

            expect(await savedBytes()).toEqual(HI);
        });

        it('supports the legacy disableAutoBOM boolean argument', async () => {
            await saveAs(new Blob(['hi'], { type: 'text/plain;charset=utf-8' }), 'hi.txt', false);

            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Deprecated'));
            expect(await savedBytes()).toEqual([...BOM, ...HI]);
        });

        it('treats a legacy `true` as disabled BOM', async () => {
            await saveAs(new Blob(['hi'], { type: 'text/plain;charset=utf-8' }), 'hi.txt', true);

            expect(await savedBytes()).toEqual(HI);
        });

        it('keeps the File name fallback when a BOM is prepended', async () => {
            await saveAs(
                new File(['hi'], 'report.csv', { type: 'text/csv;charset=utf-8' }),
                undefined,
                {
                    autoBom: true
                }
            );

            expect(mockLink.download).toBe('report.csv');
            expect(await savedBytes()).toEqual([...BOM, ...HI]);
        });

        it('tolerates a null options argument', async () => {
            await saveAs(new Blob(['hi']), 'hi.txt', null as unknown as undefined);

            expect(linkClickSpy).toHaveBeenCalled();
        });
    });

    describe('string input (URL)', () => {
        it('downloads a same-origin URL via the anchor without fetching it', async () => {
            const fetchSpy = vi.spyOn(window, 'fetch');

            await saveAs('/files/report.pdf', 'report.pdf');

            expect(fetchSpy).not.toHaveBeenCalled();
            expect(createObjectURLSpy).not.toHaveBeenCalled();
            expect(mockLink.href).toBe(new URL('/files/report.pdf', location.href).href);
            expect(mockLink.download).toBe('report.pdf');
            expect(mockLink.rel).toBe('noopener');
            expect(linkClickSpy).toHaveBeenCalled();
        });

        it('leaves the download attribute empty when no filename is given', async () => {
            await saveAs('/files/report.pdf');

            expect(mockLink.download).toBe('');
        });

        it('fetches a cross-origin URL and saves the response', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(
                new Response(new Blob(['pdf-bytes'], { type: 'application/pdf' }), { status: 200 })
            );

            await saveAs('https://example.com/files/report.pdf');

            expect(window.fetch).toHaveBeenCalledWith('https://example.com/files/report.pdf');
            expect(mockLink.download).toBe('report.pdf');
            expect(await savedBlob().text()).toBe('pdf-bytes');
        });

        it('falls back to "download" when the URL has no filename segment', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(new Response(new Blob(['x'])));

            await saveAs('https://example.com/');

            expect(mockLink.download).toBe('download');
        });

        it('still saves when the URL filename has malformed percent escapes', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(new Response(new Blob(['x'])));

            await saveAs('https://example.com/reports/Q1 100%.csv');

            expect(consoleErrorSpy).not.toHaveBeenCalled();
            expect(mockLink.download).toBe('Q1%20100%.csv');
            expect(linkClickSpy).toHaveBeenCalled();
        });

        it('applies autoBom to fetched content', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(
                new Response(new Blob(['hi'], { type: 'text/csv;charset=utf-8' }))
            );

            await saveAs('https://example.com/data.csv', undefined, { autoBom: true });

            expect(await savedBytes()).toEqual([...BOM, ...HI]);
        });

        it('opens the URL in a new tab when the fetch fails', async () => {
            vi.spyOn(window, 'fetch').mockRejectedValue(new TypeError('CORS'));

            await saveAs('https://example.com/blocked.pdf');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(mockLink.target).toBe('_blank');
            expect(mockLink.rel).toBe('noopener noreferrer');
            expect(mockLink.download).toBe('');
            expect(linkClickSpy).toHaveBeenCalled();
        });

        it('opens the URL in a new tab on a non-ok response', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }));

            await saveAs('https://example.com/missing.pdf');

            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(mockLink.target).toBe('_blank');
        });

        it('fetches a same-origin URL when the native dialog is requested', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValue(new Response(new Blob(['x'])));

            await saveAs('/files/report.pdf', 'report.pdf', { promptSaveAs: true });

            expect(window.fetch).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('never rejects and reports failures to the console', async () => {
            vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
                throw new Error('boom');
            });

            await expect(saveAs(new Blob(['x']), 'x.txt')).resolves.toBeUndefined();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                expect.stringContaining('saveAs() failed'),
                expect.any(Error)
            );
        });
    });

    describe('logging', () => {
        it('forwards the log level', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {
                /* noop */
            });

            await saveAs('/files/report.pdf', 'report.pdf', { logLevel: 'debug' });

            expect(logSpy).toHaveBeenCalledWith(
                expect.stringContaining('Downloading same-origin URL via anchor'),
                expect.anything()
            );
        });
    });
});

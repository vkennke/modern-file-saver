import {saveFile} from '../src';

describe('saveFile', () => {
    let mockLink: HTMLAnchorElement;
    let linkClickSpy: jasmine.Spy;

    beforeEach(() => {
        jasmine.clock().install();

        // Setup for link fallback mechanism
        linkClickSpy = jasmine.createSpy('link.click');
        mockLink = {
            style: {},
            href: '',
            download: '',
            click: linkClickSpy,
            nodeType: 1,  // Needed for Node interface
        } as unknown as HTMLAnchorElement;

        spyOn(document, 'createElement').and.returnValue(mockLink);
        spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
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
            promptSaveAs: false,  // Force fallback mechanism
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

        const showSaveFilePickerSpy = spyOn(window, 'showSaveFilePicker')
            .and.rejectWith(new Error('Test aborted')); // Simulate abort to prevent test from hanging

        await saveFile('test content', {
            fileName: 'test.txt',
            promptSaveAs: true,
            logLevel: 'debug'
        });

        expect(showSaveFilePickerSpy).toHaveBeenCalled();
        expect(linkClickSpy).toHaveBeenCalled(); // Fallback should be called after API error
    });
});
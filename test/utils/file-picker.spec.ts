import { describe, expect, it } from 'vitest';
import { getFilePickerOptions } from '../../src/utils/file-picker';

describe('getFilePickerOptions', () => {
    it('should suggest the filename', () => {
        expect(getFilePickerOptions('text/plain', 'notes.txt').suggestedName).toBe('notes.txt');
    });

    it('should map the MIME type to the file extension', () => {
        expect(getFilePickerOptions('application/json', 'data.json').types).toEqual([
            { description: 'File', accept: { 'application/json': ['.json'] } }
        ]);
    });

    it('should use the last extension of a multi-part filename', () => {
        expect(
            getFilePickerOptions('application/gzip', 'archive.tar.gz').types?.[0]?.accept
        ).toEqual({ 'application/gzip': ['.gz'] });
    });

    it('should strip MIME type parameters the picker does not accept', () => {
        expect(
            getFilePickerOptions('text/plain;charset=utf-8', 'a.txt').types?.[0]?.accept
        ).toEqual({ 'text/plain': ['.txt'] });
    });

    it.each([
        ['', 'a.txt'],
        ['not-a-mime-type', 'a.txt'],
        ['text/', 'a.txt']
    ])('should fall back to octet-stream for the invalid MIME type %j', (mimeType, fileName) => {
        expect(getFilePickerOptions(mimeType, fileName).types?.[0]?.accept).toEqual({
            'application/octet-stream': ['.txt']
        });
    });

    describe('extension handling', () => {
        it.each(['notes', '.hidden', 'trailing.'])(
            'should omit the types filter when %j has no usable extension',
            fileName => {
                expect(getFilePickerOptions('text/plain', fileName)).toEqual({
                    suggestedName: fileName
                });
            }
        );

        it.each([
            // Chrome rejects these and would throw a TypeError, silently
            // degrading the save to the anchor fallback.
            'data.backup 2024',
            'report.this-extension-is-far-too-long',
            'weird.ext!',
            'unicode.tär'
        ])('should drop the invalid extension of %j', fileName => {
            expect(getFilePickerOptions('text/plain', fileName)).toEqual({
                suggestedName: fileName
            });
        });

        it.each(['a.c', 'a.7z', 'a.tar-gz', 'a.c++', 'a.sixteenchars12'])(
            'should keep the valid extension of %j',
            fileName => {
                expect(getFilePickerOptions('text/plain', fileName).types).toBeDefined();
            }
        );
    });
});

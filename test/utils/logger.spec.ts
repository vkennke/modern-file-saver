import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../../src/utils/logger';

describe('createLogger', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function spyOnConsole() {
        return {
            log: vi.spyOn(console, 'log').mockImplementation(() => undefined),
            warn: vi.spyOn(console, 'warn').mockImplementation(() => undefined)
        };
    }

    it('should stay silent by default', () => {
        const console = spyOnConsole();

        const logger = createLogger();
        logger.debug('nope');
        logger.warn('nope');

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('should stay silent for level "none"', () => {
        const console = spyOnConsole();

        const logger = createLogger('none');
        logger.debug('nope');
        logger.warn('nope');

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
    });

    it('should emit warnings but no debug output for level "warn"', () => {
        const console = spyOnConsole();

        const logger = createLogger('warn');
        logger.debug('hidden');
        logger.warn('visible', { a: 1 });

        expect(console.log).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith('[modern-file-saver] visible', { a: 1 });
    });

    it('should emit debug and warnings for level "debug"', () => {
        const console = spyOnConsole();

        const logger = createLogger('debug');
        logger.debug('details', 1);
        logger.warn('careful');

        expect(console.log).toHaveBeenCalledWith('[modern-file-saver] details', 1);
        expect(console.warn).toHaveBeenCalledWith('[modern-file-saver] careful');
    });
});

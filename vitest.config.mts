import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

// Declared locally instead of pulling in @types/node just for this config file.
declare const process: { argv: string[] };

// The v8 coverage provider cannot aggregate results across multiple browser
// instances, so a coverage run is narrowed to a single browser. Correctness is
// still verified in Chromium *and* Firefox by a plain `pnpm test`.
const coverageRequested = process.argv.some(
    (arg: string) => arg === '--coverage' || arg.startsWith('--coverage.')
);

export default defineConfig({
    test: {
        // Tests need real browser APIs (URL.createObjectURL, document, Blob,
        // showSaveFilePicker, etc.) so we run them in actual browsers via
        // Playwright instead of jsdom.
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: coverageRequested
                ? [{ browser: 'chromium' }]
                : [{ browser: 'chromium' }, { browser: 'firefox' }]
        },
        include: ['test/**/*.spec.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            // Type-only module – no runtime code to cover.
            exclude: ['src/types.ts'],
            reporter: ['text', 'html', 'lcov'],
            thresholds: {
                statements: 98,
                branches: 94,
                functions: 100,
                lines: 98
            }
        }
    }
});

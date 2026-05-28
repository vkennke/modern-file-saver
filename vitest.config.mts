import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
export default defineConfig({
    test: {
        // Tests need real browser APIs (URL.createObjectURL, document, Blob,
        // showSaveFilePicker, etc.) so we run them in actual browsers via
        // Playwright instead of jsdom.
        browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
        },
        include: ['test/**/*.spec.ts']
    }
});

import { defineConfig, type Options } from 'tsup';
import { minifyFiles } from './scripts/minify';

const baseConfig: Options = {
    entry: ['src/index.ts'],
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2024',
    format: ['cjs', 'esm']
};

export default defineConfig([
    {
        ...baseConfig,
        // Generate type declarations only for the main (non-minified) build;
        // the "min" build re-uses the same .d.ts via package.json "exports".
        dts: true,
        outDir: 'dist'
    },
    {
        ...baseConfig,
        dts: false,
        outDir: 'dist/min',
        async onSuccess() {
            await minifyFiles();
        }
    }
]);

import { defineConfig } from 'tsup';
import { minifyFiles } from './scripts/minify';

const baseConfig = {
    entry: ['src/index.ts'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true
};

export default defineConfig([
    {
        ...baseConfig,
        format: ['cjs', 'esm'],
        outDir: 'dist'
    },
    {
        ...baseConfig,
        format: ['cjs', 'esm'],
        outDir: 'dist/min',
        async onSuccess() {
            await minifyFiles();
        }
    }
]);

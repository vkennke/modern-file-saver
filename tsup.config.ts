import { defineConfig } from 'tsup';

const baseConfig = {
    entry: ['src/index.ts'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2023',
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
        outDir: 'dist/min'
    }
]);

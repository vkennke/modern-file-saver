import { defineConfig, type UserConfig } from 'tsdown';
const baseConfig: UserConfig = {
    entry: ['src/index.ts'],
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2024',
    format: ['cjs', 'esm']
};
export default defineConfig([
    // Main bundle: not minified, with type declarations
    {
        ...baseConfig,
        dts: true,
        outDir: 'dist'
    },
    // Minified bundle: re-uses the main .d.ts via package.json "exports".
    // tsdown uses oxc-minify under the hood (faster than swc/terser).
    {
        ...baseConfig,
        dts: false,
        minify: true,
        outDir: 'dist/min'
    }
]);

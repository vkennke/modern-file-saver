import swc from '@swc/core';
import { promises as fs } from 'fs';

function formatBytes(bytes: number): string {
    if (bytes === 0) {
        return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'] as const;
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function minifyFiles(): Promise<void> {
    const files = ['dist/min/index.js', 'dist/min/index.mjs'];

    for (const file of files) {
        console.log(`\nProcessing ${file}...`);

        const code = await fs.readFile(file, 'utf-8');
        const originalSize = Buffer.byteLength(code, 'utf-8');
        console.log(`Original size: ${formatBytes(originalSize)}`);

        const minified = await swc.minify(code, {
            compress: { unused: true },
            mangle: true,
            module: true
        });

        const minifiedSize = Buffer.byteLength(minified.code, 'utf-8');
        const savings = (((originalSize - minifiedSize) / originalSize) * 100).toFixed(1);

        await fs.writeFile(file, minified.code);
        console.log(`Minified size: ${formatBytes(minifiedSize)}`);
        console.log(`Reduction: ${savings}%`);
    }
}

// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.test.json'],
                tsconfigRootDir: import.meta.dirname
            }
        }
    },
    {
        // Test files: relax rules that are intentionally or unavoidably violated in test code
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            // vitest's `expect(...).toHaveBeenCalled()` pattern triggers this rule incorrectly
            '@typescript-eslint/unbound-method': 'off'
        }
    },
    {
        ignores: ['dist/**', 'node_modules/**', '*.config.{mts,mjs}']
    }
);


# Migrating from `file-saver`

[`file-saver`](https://github.com/eligrey/FileSaver.js) has not seen a release since November 2020.
`modern-file-saver` is a zero-dependency replacement that adds
[File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) support,
built-in TypeScript types and a real ESM build.

Migration is designed as two independent steps. **Step 1 gets you off the unmaintained dependency in
minutes; step 2 is optional** and can be done file by file, whenever it suits you.

- [Step 1 – Drop-in replacement](#step-1--drop-in-replacement)
- [Step 2 – Move to the modern API](#step-2--move-to-the-modern-api)
- [Behaviour differences to check](#behaviour-differences-to-check)
- [`saveAs()` reference](#saveas-reference)
- [Migration checklist](#migration-checklist)

## Step 1 – Drop-in replacement

`modern-file-saver/compat` exports a `saveAs()` with the exact same signature and semantics as
`file-saver`. Only the import specifier changes:

```diff
-import { saveAs } from 'file-saver';
+import { saveAs } from 'modern-file-saver/compat';

 saveAs(blob, 'hello.txt');
```

All the usual import styles keep working:

```typescript
import { saveAs } from 'modern-file-saver/compat';
import saveAs from 'modern-file-saver/compat';
import FileSaver from 'modern-file-saver/compat'; // FileSaver.saveAs(...)

const { saveAs } = require('modern-file-saver/compat');
```

### Automate the rewrite

No codemod needed – the change is a plain string replacement:

```bash
# macOS
grep -rl "'file-saver'" src | xargs sed -i '' "s#'file-saver'#'modern-file-saver/compat'#g"

# Linux
grep -rl "'file-saver'" src | xargs sed -i "s#'file-saver'#'modern-file-saver/compat'#g"
```

Then drop the old dependencies:

```bash
npm uninstall file-saver @types/file-saver
npm install modern-file-saver
```

Add a guard so the old package cannot sneak back in via `eslint.config.js`:

```javascript
{
    rules: {
        'no-restricted-imports': [
            'error',
            {
                paths: [{ name: 'file-saver', message: "Use 'modern-file-saver' instead." }]
            }
        ]
    }
}
```

### What the compat layer costs you

The compat entry point is a separate export, so the extra code is only bundled when you actually
import it (~0.9 kB min+gzip on top of the core). It is a **migration aid, not the destination**: it
keeps `file-saver`'s fire-and-forget contract, which means it cannot report errors to your code. See
step 2.

## Step 2 – Move to the modern API

```diff
-import { saveAs } from 'modern-file-saver/compat';
+import { saveFile } from 'modern-file-saver';

-saveAs(blob, 'hello.txt');
+await saveFile(blob, { fileName: 'hello.txt' });
```

Three mechanical changes per call site:

| #   | Change                                                      | Why                                           |
| --- | ----------------------------------------------------------- | --------------------------------------------- |
| 1   | `saveAs(data, name)` → `saveFile(data, { fileName: name })` | Named options instead of positional arguments |
| 2   | Add `await` (and make the enclosing function `async`)       | `saveFile()` returns a `Promise<void>`        |
| 3   | Add a `try/catch` where it matters                          | Errors are now surfaced instead of swallowed  |

What you gain:

```typescript
import { saveFile } from 'modern-file-saver';

try {
    await saveFile(blob, { fileName: 'report.pdf' });
    // Guaranteed: the file has been written to disk.
} catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
        return; // User cancelled the native save dialog.
    }
    showErrorToast(err); // Quota exceeded, permission denied, …
}
```

- A **native save dialog** in Chromium-based browsers, so the user picks the target folder
- A promise that settles when the file is actually written – not when the download was kicked off
- Real error handling, including a distinguishable `AbortError` on cancellation
- More input types: plain strings, objects/arrays (→ JSON), base64, data URLs, `ArrayBuffer`,
  `TypedArray`, `FormData`, `URLSearchParams`

### `saveFile()` does not fetch URLs

This is the one change that is **not** mechanical. `file-saver` treated every string as a URL and
downloaded it; `saveFile()` treats a string as the file's content:

```typescript
// file-saver / compat: downloads the URL
saveAs('https://example.com/report.pdf', 'report.pdf');

// saveFile: writes the literal text "https://example.com/report.pdf" into report.pdf (!)
await saveFile('https://example.com/report.pdf', { fileName: 'report.pdf' });

// Correct: fetch it yourself, with your own error handling
const response = await fetch('https://example.com/report.pdf');
if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
}
await saveFile(await response.blob(), { fileName: 'report.pdf' });
```

**Search your codebase for `saveAs(` calls with a string first argument before doing step 2.** Those
are the only call sites where a blind rewrite silently produces a corrupt file. Until you have
reviewed them, leave them on `modern-file-saver/compat`, which keeps the URL behaviour.

## Behaviour differences to check

| Topic                      | `file-saver`            | `modern-file-saver/compat`            | `modern-file-saver`                  |
| -------------------------- | ----------------------- | ------------------------------------- | ------------------------------------ |
| String input               | URL, downloaded via XHR | URL, downloaded via `fetch`           | File **content**                     |
| Native save dialog         | never                   | opt-in via `promptSaveAs: true`       | default, with fallback               |
| Return value               | `undefined`             | `Promise<void>`, never rejects        | `Promise<void>`, rejects on error    |
| Errors                     | `console.error`         | `console.error`                       | thrown                               |
| `autoBom`                  | supported               | supported                             | use a `Blob` with a leading `\uFEFF` |
| IE/Edge `msSaveOrOpenBlob` | supported               | dropped                               | dropped                              |
| Popup/FileReader fallback  | supported               | dropped                               | dropped                              |
| Web Worker                 | silent no-op            | throws (reported via `console.error`) | throws                               |

Notes:

- **Dropped legacy paths.** `msSaveOrOpenBlob` (IE 10/11, legacy Edge) and the `FileReader` + popup
  fallback only existed for browsers that no longer receive security updates. Every browser in the
  `defaults` browserslist query supports `<a download>`.
- **Default filename for URLs.** `file-saver` named a URL download `download` when no filename was
  passed. The compat layer instead lets the browser derive the name from `Content-Disposition` or
  the URL path, which is almost always what you wanted.
- **Cross-origin URLs.** `file-saver` probed CORS with a _synchronous_ XHR. The compat layer uses
  `fetch()` and, if that fails, falls back to opening the URL in a new tab – same end result, no
  deprecated synchronous request. The popup may be blocked; the failure is logged.

## `saveAs()` reference

```typescript
saveAs(data: Blob | string, fileName?: string, options?: FileSaverOptions | boolean): Promise<void>
```

| Parameter              | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `data`                 | A `Blob`/`File`, or a string that is treated as a **URL**                                 |
| `fileName`             | Suggested filename. Defaults to `File.name`, the URL's last path segment, or `'download'` |
| `options.autoBom`      | Prepend a UTF-8 BOM for UTF-8 text/XML MIME types. Default `false`                        |
| `options.promptSaveAs` | Opt into the native save dialog. Default `false` (`file-saver` parity)                    |
| `options.logLevel`     | `'debug' \| 'warn' \| 'none'`. Default `'none'`                                           |

A boolean third argument is still accepted as the legacy `disableAutoBOM` flag and logs a
deprecation warning, exactly like `file-saver` did.

The returned promise resolves once the save has finished and **never rejects** – failures are
reported via `console.error`, matching `file-saver`'s fire-and-forget contract. Switch to
`saveFile()` when you need to handle errors.

## Migration checklist

- [ ] Replace `'file-saver'` imports with `'modern-file-saver/compat'`
- [ ] Remove the `file-saver` and `@types/file-saver` dependencies
- [ ] Add a `no-restricted-imports` rule for `file-saver`
- [ ] Verify each download flow still works (they should – the behaviour is unchanged)
- [ ] Find `saveAs(` calls with a string first argument and rewrite them to an explicit `fetch`
- [ ] Move the remaining call sites to `saveFile()` and add error handling
- [ ] Drop the `modern-file-saver/compat` import once no call sites are left

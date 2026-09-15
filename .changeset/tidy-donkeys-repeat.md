---
'modern-file-saver': minor
---

Add a `file-saver` compatibility layer and a migration guide.

`modern-file-saver/compat` exports a `saveAs()` with the same signature and semantics as
`file-saver`, so migrating off the unmaintained package is a single import change:

```diff
-import { saveAs } from 'file-saver';
+import { saveAs } from 'modern-file-saver/compat';
```

It supports named, default and `FileSaver.saveAs` imports, the `autoBom` option (including the
legacy `disableAutoBOM` boolean), and keeps treating string input as a URL to download. The native
save dialog can be opted into per call via `{ promptSaveAs: true }`. The compat layer is a separate
entry point (`./compat`, `./min/compat`), so its code is only bundled when imported.

The new `MIGRATION.md` documents the full path from `file-saver` to `saveFile()`, including the
behaviour differences that a blind rewrite would get wrong.

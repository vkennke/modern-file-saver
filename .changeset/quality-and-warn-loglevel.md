---
'modern-file-saver': major
---

### Breaking changes

- **`saveFile(formData)` now rejects when the `FormData` contains
  `File`/`Blob` values.** `x-www-form-urlencoded` cannot represent
  binary content, and the previous behaviour silently serialised such
  values as `"[object File]"`, effectively corrupting the output. The
  error message points to the right alternative: pass the `File`
  directly to `saveFile()`, or serialise the `FormData` yourself (e.g.
  as multipart). Note: `FormData.append(name, Blob)` materialises the
  `Blob` as a `File` with name `"blob"` per the WHATWG XHR spec, so
  raw `Blob` appends are also covered by this check.

### Features

- **New `logLevel: 'warn'`** option that logs only warning messages
  while staying silent for debug output. Useful when you want to
  surface fallback/API issues without verbose chatter.

### Fixes

- **File System Access write errors now propagate correctly.** When
  `writable.write()` rejects (e.g. disk full, quota exceeded), the
  partially-written file is discarded via `writable.abort()` and the
  original error is re-thrown. Previously `writable.close()` was
  called in a `finally` block, which could persist a truncated file
  and/or mask the real error.

### Internal

- Stricter type checking via `exactOptionalPropertyTypes: true`.
- ESLint with the type-aware `typescript-eslint` rule set.
- Test coverage reporting via `@vitest/coverage-v8`
  (`npm run test:coverage`).


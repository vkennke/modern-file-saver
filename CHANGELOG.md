# Changelog

## 3.0.0

### Major Changes

- [`cf3cced`](https://github.com/vkennke/modern-file-saver/commit/cf3cced9b35a8174f0c170eedab048dfa6dbb11e) Thanks [@vkennke](https://github.com/vkennke)! - ### Breaking changes
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

## 2.0.1

### Patch Changes

- [`348398d`](https://github.com/vkennke/modern-file-saver/commit/348398dfbe9e5ca82aa9e37d27753ee192ee1d08) Thanks [@vkennke](https://github.com/vkennke)! - Add a "Migrating from file-saver" section to the README with a feature
  comparison and API translation, plus npm keywords (`file-saver`,
  `saveAs`, etc.) for better discoverability by users searching for a
  maintained replacement of the deprecated `file-saver` library.

- [`6b75677`](https://github.com/vkennke/modern-file-saver/commit/6b756778d2b24d108f00a45a6bbb9ddf53040da5) Thanks [@vkennke](https://github.com/vkennke)! - Internal toolchain modernisation – no runtime behaviour or public API
  changes. The published artefacts are equivalent to v2.0.0.
    - Replace tsup with [tsdown](https://tsdown.dev) as the build tool and
      drop `@swc/core`. tsdown's built-in oxc-minify produces the same
      ~3.25 kB raw / ~1.5 kB gzipped bundle.
    - Replace Karma + webpack + Jasmine with
      [Vitest browser mode](https://vitest.dev/guide/browser/) backed by
      Playwright. Tests run in headless Chromium + Firefox out of the box
      and execute significantly faster.
    - Add explicit minimal `permissions: contents: read` to the CI workflow
      for a more secure default token scope.

## 2.0.0

### Major Changes

- [`1e6450a`](https://github.com/vkennke/modern-file-saver/commit/1e6450a47228bcf3268e0008eecc3fbf4b62a5be) Thanks [@vkennke](https://github.com/vkennke)! - Stable release of v2.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and from v2.0.0 onwards this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From v2.0.0-rc.2 onwards, entries are generated automatically by
[Changesets](https://github.com/changesets/changesets).

## 2.0.0-rc.1

### Patch Changes

- Fix npm publish failing on prerelease versions by deriving the npm
  `dist-tag` from the semver prerelease identifier (e.g. `v2.0.0-rc.0` →
  `rc`). Stable releases continue to use `latest`.
- Fix bundle size claim and `FormData` MIME-type description in the README
  (previously stated `multipart/form-data`, which was incorrect).

## 2.0.0-rc.0

This is the first release candidate for v2.0.0. It contains a number of
correctness fixes, internal modernisation and one breaking change.

### Breaking Changes

- **`FormData` input is now serialised with MIME type
  `application/x-www-form-urlencoded`** (previously `multipart/form-data`
  without a boundary, which was invalid). Consumers relying on the old type
  string need to update their handling.
- The minimum supported Node.js version for development/build was raised
  from 14 to **20** (Node 18 reached EOL in April 2025). The runtime
  target remains browsers; this only affects building and consuming the
  package from CI.
- `InputType` was narrowed from `object` to
  `Record<string, unknown> | readonly unknown[]`. Pass-through of `Date`,
  `Map`, `Set`, `null` etc. is no longer typed as supported and will now
  throw at runtime instead of being JSON-stringified to `{}`.

### Added

- Re-export of public types (`InputType`, `SaveOptions`, `LogLevel`,
  `Logger`) from the package root for easier consumption.
- `LICENSE` file (ISC).
- `.editorconfig` for consistent editor behaviour across contributors.
- GitHub Actions CI workflow running lint, prettier-check, tests and
  build on Node 20/22/24.
- GitHub Actions release workflow using **npm Trusted Publishing (OIDC)
  with provenance** – no long-lived `NPM_TOKEN` required.
- `CHANGELOG.md` and Changesets integration for future releases.

### Changed

- **Base64 decoding** uses `atob` + `Uint8Array` instead of
  `fetch(dataUrl)`. This is faster and now actually validates invalid
  base64 input (the old path could silently produce empty blobs).
- **Fallback download cleanup is now awaitable**: the function only
  resolves after the object URL has been revoked and the temporary
  anchor element removed. The previous `setTimeout(..., 100)` could
  leak the URL if the caller did not wait.
- **File System Access API errors**:
    - `AbortError` (user cancelled the save dialog) is now correctly
      re-thrown instead of silently falling back to the anchor download.
    - All other errors fall back as before.
- **MIME-type override** (`options.mimeType`) is now honoured for
  `URLSearchParams` and `FormData` inputs (previously ignored).
- **File picker options**:
    - File extension is derived correctly from the filename (previous
      logic had a no-op `startsWith('.')` check and produced wrong
      results for files without an extension).
    - The MIME type passed to the picker is sanitised (parameters like
      `; charset=utf-8` are stripped, malformed types fall back to
      `application/octet-stream`).
- **SSR safety**: `window` access is now guarded so importing the package
  in a non-browser environment does not throw at module load time.
- **Logger** simplified from a class to a factory with a noop fast-path
  when logging is disabled.
- **Build configuration** (`tsup`):
    - `platform: 'browser'`
    - `target: 'es2024'`
    - Type declarations are emitted only once and shared between the
      main and minified bundles via `package.json` `exports`.
- **`package.json`**:
    - `"sideEffects": false` for better tree-shaking.
    - `"types"` field at the top level for legacy consumers.
    - `exports` order corrected (`types` first, then `import`, then `require`).
    - `./package.json` export added.
    - Source-map files are excluded from the published tarball.
- **Karma**:
    - Default browsers switched to `ChromeHeadless` + `FirefoxHeadless`
      for CI compatibility.
    - `ts-loader` uses `tsconfig.test.json` with `transpileOnly` for
      significantly faster test runs.

### Fixed

- `convertToBlob` no longer treats `null`, `Date`, `Map` and `Set` as
  JSON-stringifiable plain objects.
- `convertToBlob` now throws a real error for unsupported input types
  (numbers, symbols, functions, `null`) instead of returning unexpected
  results.
- `scripts/minify.ts`: clamp the size-unit array index to avoid a
  potential `undefined` access under `noUncheckedIndexedAccess`.
- Tests no longer leak async assertions that ran after the spec ended
  (the previous "object input to JSON" test).

## 1.2.4 and earlier

See the [git history](https://github.com/vkennke/modern-file-saver/commits/main)
for prior releases.

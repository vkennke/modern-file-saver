---
'modern-file-saver': patch
---
Internal toolchain modernisation – no runtime behaviour or public API
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

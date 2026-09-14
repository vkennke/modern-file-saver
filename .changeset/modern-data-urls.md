---
'modern-file-saver': minor
---

Fix several correctness bugs and speed up blob conversion.

**Bug fixes**

- Data URLs whose media type carries parameters (e.g.
  `data:text/plain;charset=utf-8;base64,…`, which is what `canvas.toDataURL()`
  and many SVG serialisers produce) threw `Invalid base64 data URL` instead of
  being decoded. The media type – including its parameters – is now preserved on
  the resulting blob.
- `saveFile()` could hang forever in hidden or backgrounded tabs: the anchor
  fallback awaited a bare `requestAnimationFrame`, which browsers do not fire
  while a tab is not rendering. The returned promise never settled and the
  object URL leaked. The frame wait is now raced against a timeout.
- `logLevel: 'warn'` produced no output at all, because the fallback notice was
  logged at `debug` level. Falling back from the File System Access API is now
  reported via `console.warn` as documented.
- Values whose state lives in internal slots (`Error`, `Promise`, `RegExp`,
  `WeakMap`, …) were accepted as "plain objects" and `JSON.stringify`d to `{}`,
  silently writing an empty file. They are now rejected, and every
  "unsupported input" error names the type it received. Class instances with own
  enumerable properties keep working.
- Filenames with an unusual extension (e.g. `data.backup 2024`) made
  `showSaveFilePicker()` throw a `TypeError`, silently degrading the save to the
  anchor fallback. Extensions are now validated before being passed to the
  picker, and MIME types are validated after their parameters are stripped.

**Improvements**

- The native save dialog is opened *before* the input is serialised. The File
  System Access API requires transient user activation, which a slow conversion
  could otherwise exhaust. Unsupported input is still rejected up front, so no
  dialog is shown for a save that cannot succeed.
- Re-typing a `Blob`/`File` via the `mimeType` option no longer reads its
  contents into memory – it uses a zero-copy `slice()` instead of an
  `arrayBuffer()` round-trip.
- Base64 decoding uses `Uint8Array.fromBase64()` where available, avoiding the
  intermediate binary string `atob()` requires, with `atob()` kept as fallback.
- Source maps are now published with the package. They were previously excluded
  from `files` while the bundles still referenced them, which produced 404s in
  consumer devtools. `src/` is published alongside them so the emitted
  declaration maps resolve and "Go to Definition" lands on the annotated source.

---
'modern-file-saver': patch
---

Fix a polynomial worst case (CWE-1333) in the compatibility layer's `autoBom` MIME type check. The pattern was copied verbatim from `file-saver`, where the `\S*` groups also match `/` and `;`. The type is now split at its first parameter separator and both halves are matched without an ambiguous repetition, which classifies every well-formed MIME type exactly as before.

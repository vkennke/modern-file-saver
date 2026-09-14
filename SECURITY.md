# Security Policy

## Supported Versions

Only the latest published major version of `modern-file-saver` receives security
fixes.

| Version | Supported |
| ------- | --------- |
| 3.x     | ✅        |
| < 3.0   | ❌        |

## Reporting a Vulnerability

Please **do not** open a public issue for security problems.

Report vulnerabilities privately via GitHub Security Advisories:
<https://github.com/vkennke/modern-file-saver/security/advisories/new>

Please include:

- affected version(s)
- a description of the issue and its impact
- reproduction steps or a proof of concept

You can expect an initial response within 7 days. Confirmed issues are fixed in
a patch release and credited in the advisory unless you prefer otherwise.

## Scope

`modern-file-saver` runs entirely in the browser, has zero runtime dependencies
and performs no network requests. Relevant classes of issues include:

- writing data the caller did not intend to write (silent corruption or loss)
- bypassing the browser's download / File System Access API security model
- supply-chain integrity of the published npm package

Releases are published from CI via npm Trusted Publishing (OIDC) with provenance
attestation, so package integrity can be verified with `npm audit signatures`.

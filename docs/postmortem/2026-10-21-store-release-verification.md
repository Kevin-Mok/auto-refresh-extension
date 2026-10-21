# Store release verification environment

Record environment-only limitations encountered while preparing the upload candidate. Use permitted localhost execution and current official sources, then keep native store/account acceptance separate from automated checks.

## Evidence and resolution
- A worker’s first full test run failed because the sandbox rejected the existing demo server’s loopback listener with EPERM. Direct test diagnostics confirmed listen EPERM on 127.0.0.1. This matches the existing verification-tooling incident and tasks/lessons.md; no production or fixture change was required.
- Lookup: canonical incident memory searched `extension localhost sandbox EPERM privacy gate`; existing environment/privacy guidance was consulted. Only the previously evidenced socket restriction applies; unrelated findings do not justify a new production remedy.
- Re-run with localhost execution permission passed all 29 tests, exit 0. The full isolated Chromium harness also passed, including real 1/29/30-second reloads and browser restart.
- A web tool fetch of Chrome’s user-data FAQ timed out. Requirements were also researched against current official privacy fields/images documentation and the docs researcher’s primary-source review. No policy was inferred from a failed page fetch, and the delivered guide links the official FAQ for publisher review.
- Exact candidate/artwork capture passed with loopback pregranted only in a disposable copy. Native host permission consent, store declarations, approval and live store-install acceptance remain manual; none is claimed from headless fixtures.
- Learning decision: no new general recovery remedy. Existing localhost/environment boundaries and separation of static publication from live marketplace acceptance already cover the evidence. Register this report’s reviewed hash in the canonical ledger; do not modify installed skill copies.

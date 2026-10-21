# Chrome Web Store release preparation

Prepare the same practical publishing kit as the Twitch extension: a minimal installable ZIP, public help/privacy pages, truthful listing and reviewer copy, required images, and a short account-dashboard checklist. The user authorized doing as much preparation as possible, then handing off manual submission steps.

## Scope and decisions
- Keep runtime timing behavior and permissions intact. No OAuth, backend, telemetry, new runtime dependencies, or claims of guaranteed timing/store approval.
- Follow the sibling release builder’s explicit file allowlist and deterministic archive approach; do not copy its credentials, account-specific configuration, MIT license choice, or Twitch-specific declarations.
- Bundle help.html, privacy.html and public.css; publish those static files via GitHub Pages for this existing public repository. Use GitHub Issues for support. Source is public; no license is selected on the user’s behalf.
- Package version 1.0.0 at artifacts/auto-refresh-cache-1.0.0.zip and a validated unpacked candidate beside it. Ignore artifacts; commit only source and intended store assets.
- Store data disclosures include web browsing activity: exact page URLs and refresh settings are processed/stored locally, with no publisher transmission. Normal refreshes still contact the page’s website.
- Prepare a 128px icon with transparent padding, required 440×280 promo and a 1280×800 image incorporating a genuine local-fixture popup capture. Label capture evidence honestly.
- Use existing main checkout: it was clean at this request; no unrelated work is present. Related plan/docs travel in the same commit as implementation. Hosting requires committing/pushing the reviewed static pages; final store upload, identity/trader declarations, certifications, and submission remain manual.

## Atomic work
- [x] Package CLI: define tests, observe RED, implement package/inspect with deterministic allowlist and safe unpacked candidate.
- [x] Help/privacy pages, listing/privacy/reviewer text, required images and repeatable capture.
- [x] Full tests, actual ZIP install/browser checks, static-page and image visual verification; independent evidence review.
- [x] Prepare public Pages hosting, record the candidate hash and precise dashboard steps; run final post-push HTTPS/source-byte verification into artifacts/pages-receipt.json before the final handoff.

## Risks and verification
Review exact ZIP entries and dependencies, icon dimensions/padding, no symlink/path escapes, deterministic bytes and malformed archives. Load the extracted candidate, start/stop a timer and observe badge change. Validate actual screenshots and pages at desktop/mobile sizes. Native permission UI and real-world sleep/Twitch remain manual. Never claim Web Store publication from GitHub Pages availability. If hosting permissions fail, retain local work and provide exact account steps.

## Handoff
Suggested commit: build: prepare Chrome Web Store release. Cursor continuation: read this plan, docs/chrome-web-store-release.md and store-assets/listing.md; reproduce package/inspect, run npm test and browser verification, then complete only remaining dashboard checks. Rollback source with a reverting commit; disable the unpacked candidate without deleting saved rules unless desired.

## Verification and deployment milestone — build: prepare Chrome Web Store release
- ZIP candidate:15 runtime files,30,333 bytes; SHA256 be83e1dfe9c4e05812d7547a1b5e8369ca4440352be10ab17ad30c6decc77b51. Candidate bytes match all15 current runtime sources.
- Tests:29/29, browser-store.log complete/pass, exact-candidate capture and desktop/mobile pages pass. Required image dimensions and icon transparency verified; final artwork visually reviewed.
- GitHub Pages config accepted for main/root. The GitHub wrapper lacks Pages settings, so the native GitHub API was used for that configuration. Publication of these files requires their source commit push; preserve the post-push anonymous HTTPS result in ignored artifacts/pages-receipt.json and report it to the user. No further tracked mutation is required to record that live receipt.
- No pre-existing dirty files at request start. Session-scoped source, tests, public pages, listing art/docs, incident and this plan belong together. Runtime ZIPs/output and machine-local files stay excluded. Existing private canonical incident-ledger records remain outside this repository’s commit.
- Remaining manual work: native optional-permission acceptance; existing publisher account declarations; uploadZIP/images/copy in a new store item; certify privacy; submit/review/publish; verify store install. No product/code blocker found so far.

## Final review
Independent evidence review verified packaging safety/determinism, candidate/source identity,29-test transcript, actual Chromium behavior, required asset sizes/padding, genuine screenshot provenance, privacy/listing accuracy, unchanged permissions and manual dashboard instructions. No implementation blocker. Pages activation requires the post-push receipt; native/store acceptance deliberately remains manual. Final policy explicitly distinguishes browser navigation URL processing from site-granted injection/reload access. This changed ZIP hash is recorded above.

Session scope: direct observed-write fallback for 01a1602e-f530-7200-abf0-b33f545e6961, because the scope helper cannot recognize nested writes. The request began from a clean worktree after e74a1f6. Commit only this release kit, its tests/docs/assets and matching plan; do not include ignored candidates/old preparation copies or changes in the reference repository.

Final wording correction from independent review: host-wide registered guard injection is distinct from exact-page timer arming. Privacy now says timers/refresh run only on granted sites and saved pages, without falsely limiting guard injection. Rebuilt and inspected final candidate; popup/UI code and images are unchanged by this shorter policy-only correction. Final source/ZIP identity is verified directly before commit.

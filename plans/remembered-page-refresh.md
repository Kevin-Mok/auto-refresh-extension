# Remembered page refresh

Build a local Manifest V3 extension with exact-page saved intervals, independent tab countdowns, tab-only pauses, and a compact dark popup. Implement the supplied prompt, test scheduling first, then verify in Chrome.

## Scope and decisions
- Plain bundled HTML/CSS/JavaScript; no runtime dependencies, backend, analytics or publishing.
- Local rules; session countdowns and pause map. Match serialized HTTP(S) URLs except fragments.
- Site permission is necessarily site-wide; refresh rules remain exact-page. Request only the current site's scheme/host from the Start gesture.
- Intervals: whole seconds from 1 through 2,147,483,647; no unsafe arithmetic.
- Alarm >=30 seconds; isolated document timers below 30. All reloads validated in worker and synchronously in the target document.
- Initial ruling: implement in the empty supplied workspace before Git setup; there was no existing user code to preserve. The later public-delivery request authorizes Git initialization and publication.
- Ruling: supplied plan is the approved design: compact charcoal/teal utility for people revisiting pages. No further design discovery needed.

## Atomic work
- [x] Defining tests: interval/URL validation and tab state/race/lifecycle behavior; observe RED.
- [x] Manifest, worker/controller, content scheduler, popup.
- [x] Automated regressions and real Chrome verification.
- [x] README, smoke checks, portable prompt, final review and evidence.

## Risks and verification
Chrome may delay all timers; no catch-up reload bursts. Browser restart clears tab pauses, extension reload also clears session storage by Chrome design. Permission denial/revocation must never say Running. Verify 1/29/30/600 seconds, invalid inputs, exact URL matching, navigation and SPA, peer tabs, stop/resume, clear, worker/browser restarts and stale callbacks. Keep actual observed results separate from manual checks still outstanding.


## Verification and review outcome
- Intentional RED observed for missing core modules; reviewer/boundary regressions failed for their expected behavior before fixes.
- Final automated run: 22/22 tests passed (rules 4, engine 12, content 3, background 1, demo 2). All src/scripts syntax checks and manifest JSON parse passed.
- Real Chromium suite passed on the initial complete run: actual 1/29/30-second reloads, real popup normalization and invalid input, independent tabs, pause/reload, SPA, worker stop/wake, Clear and full browser restart. Final stable-Playwright rerun also passed, exit 0; evidence is in ignored output/playwright/browser-final.log.
- Ruling: headless native host prompt is unavailable; browser harness uses a disposable copy pregranted only for loopback. Delivered manifest stays optional-only. Cost: native allow/deny/revoke needs manual acceptance against the original extension.
- Review fixes: preserve actual alarm deadlines; Resume preserves unchanged-interval peers; authenticate popup contexts first; Stop rejects stale page URLs. No unresolved production-code findings from the review.
- README gate applied and updated in the same deliverable. Smoke checks and portable prompt saved. No runtime dependency/build required, no publishing or unrelated refresh features.
- Manual limits: native permission UI, live Twitch SPA, BFCache/discard/sleep variants, keyboard/screen reader and zoom remain in docs/smoke-tests.md; a full 600-second wait was not run.
- Local postmortem and repo lessons updated; reviewed evidence is registered in the canonical knowledge ledger.
- Initial implementation preceded Git setup. The publication milestone below supersedes the initial no-commit delivery.


## Public delivery milestone — feat: add remembered page auto refresh
- User authorized Git initialization and a public GitHub repository named `auto-refresh-extension`.
- Initialized `main`. Included implementation, tests, documentation, prompt and this plan in one initial commit.
- Public-file review found no credentials or files over 3 MB. Generated browser output, dependency folders, environment files and local agent/account directories are excluded.
- Removed workstation-specific paths from installation and evidence documentation. README gate passed after portability updates.
- Fresh `npm test`: 22 passed, 0 failed; JavaScript syntax and manifest JSON checks passed. Browser behavior was unchanged by publication preparation; prior browser evidence and remaining manual limits are documented in docs/verification.md.
- Status before commit: implementation and public documentation complete; no blockers. Next: create the public GitHub repository, push `main`, and verify the remote commit and visibility.

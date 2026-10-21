# Verification evidence

Use this record to distinguish checks executed during implementation from manual checks still required in the user's normal Chrome profile. Automated tests exercise the real state engine and content guard; the browser harness observes reloads against a local timestamp page.

## Executed on 2026-10-21

- Initial intentional RED: rules and engine test files could not import the absent implementation.
- Reviewer regression RED→GREEN: duplicate readiness/worker wake preserves the actual alarm deadline; unchanged-interval Resume preserves peer token/deadline.
- Boundary RED→GREEN: trusted popup messages are accepted both as toolbar popup and extension tab; stale popup Stop cannot cancel another page's timer.
- Fixture RED→GREEN: server announces and serves its URL; occupied preferred port falls back without disturbing its listener.
- Final `npm test`: **22 tests passed, 0 failed**, exit 0. Breakdown: rules 4, engine 12, content guard 3, background dispatch 1, demo 2.
- `node --check` for all `src/*.js` and `scripts/*.js`: exit 0. Manifest parsed with `JSON.parse`: exit 0.
- Separate final source review identified the alarm and Resume defects above; both were corrected with regressions. Final author boundary review added stale-Stop validation.

## Real Chromium checks

The final browser harness run passed with installed stable Playwright 1.61.1 and extension-capable Chromium, using a fresh temporary profile. No user's normal browser data was used. The harness copies the extension and adds required access **only for the loopback fixture host** in that disposable copy, because headless Chrome cannot accept its native optional-host prompt. The delivered manifest remains optional-host-only. This does not verify the native permission grant UI.

Observed in the browser:

- Real popup Start normalizes 600 seconds to 10m 0s; fractional input is rejected without changing the saved rule; Stop pauses this tab.
- 1-second and 29-second document timers cause actual reloads, observed as server timestamp changes.
- A 30-second one-shot alarm causes an actual reload.
- A 600-second rule persists and appears in a newly opened matching tab with independent state; the full ten-minute wait was not exercised.
- Focus changes preserve the deadline; SPA away/back changes it to a fresh full interval and leaves unsaved routes inactive.
- Pause survives reload and SPA away/back.
- Actual CDP `ServiceWorker.stopAllWorkers`, followed by extension wake, preserves the current deadline.
- Clear removes shared rules and alarms, cancels peer schedules, and prevents auto-start on a subsequent reload.
- Closing and relaunching the full isolated browser with the same profile retains rules, clears pauses and starts fresh timers.
- Captured `output/playwright/popup.png`; visually reviewed the charcoal/teal layout, URL, countdown, fields and controls. Final run exited 0; `output/playwright/browser-final.log` records all phases. Browser logs/screenshots are ignored local evidence, not extension assets.

## Remaining manual checks

Use [smoke-tests.md](smoke-tests.md) against the original unpacked extension for native host-permission allow/deny/revoke, toolbar-popup behavior, Twitch's live SPA, browser Back/BFCache/discarded-tab variants, long URLs and increased zoom, keyboard/screen-reader operation, and actual background/sleep throttling. No live Twitch reloads or full 600-second wait were performed. Denial/revocation, malformed data, 1/29/30/600 boundaries, query/port/fragment matching and stale callbacks are covered by automated state/guard tests; this does not replace those native checks.

## Review and delivery

README review: install, daily controls, permission scope, timing limits, script options and evidence are documented before handoff. No build is required and no runtime dependency was added. The first implementation was verified before Git initialization. The initial public commit includes the implementation, tests, documentation and matching plan.

No runtime configuration or normal browser profile was modified. The completed verification incident is recorded in [the postmortem](postmortem/2026-10-21-verification-tooling.md).

## Primary API references

Implementation decisions were checked against official Chrome documentation for [permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [persistent script registration](https://developer.chrome.com/docs/extensions/reference/api/scripting), [alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms), [session storage](https://developer.chrome.com/docs/extensions/reference/api/storage), and [navigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation). Site permission is broader than exact-page rule matching; session memory and persistent registration have different restart lifetimes.

## Toolbar countdown follow-up — 2026-10-21

- Defining RED: expected `600` badge absent, badge updater absent, and document update interval absent. Implemented per-document ticks, authenticated worker updates and deadline-derived whole seconds.
- Fresh full npm test: **25 passed, 0 failed**, exit 0 with localhost access. The sandbox-only run failed in the existing socket fixture; no production failure was found.
- Real Chromium harness exited 0 using Playwright Core 1.62.1. Observed decreasing total-second badge with popup closed, blank badges after Stop/Clear, Minutes/Seconds above page details, 600-second normalization, fractional-input rejection, real 1/29/30-second reloads, independent tabs, pause persistence, SPA, worker stop/wake and browser restart.
- Screenshot `output/playwright/popup.png` and full log `output/playwright/browser-current.log` are ignored local evidence. No user browser profile was changed. Icon assets are bundled locally; Chrome’s native badge needs no new permission. See [Chrome action documentation](https://developer.chrome.com/docs/extensions/reference/api/action) for icon and per-tab badge behavior.
- Native toolbar pinning, permission prompts, live Twitch and sleeping/background throttling remain manual. Large badge values may be clipped; hover displays the full seconds.

## Chrome Web Store preparation — 2026-10-21

- Package CLI defining RED observed before scripts/release.py existed; release tests GREEN4/4. Fresh full npm test: **29 passed, 0 failed**, exit0 with localhost access. Coverage includes byte-identical rebuilds, excluded unrelated files, missing injected dependencies, wrong icon sizes, archive traversal, source symlinks and protected existing installations.
- python3 scripts/release.py package and inspect passed: 15 runtime files, **30,333 bytes**, SHA256 **be83e1dfe9c4e05812d7547a1b5e8369ca4440352be10ab17ad30c6decc77b51**. The ZIP and extracted candidate are ignored artifacts; all 15 candidate files were compared byte-for-byte to final runtime source.
- Full Chromium harness exited0; complete ignored log is output/playwright/browser-store.log. Real 1/29/30-second refreshes, popup-closed badge countdown, independent tabs, pauses, SPA navigation, worker wake, Clear and full browser restart passed.
- Store capture ran against the extracted candidate in an isolated profile: genuine Running popup after600 seconds, normalized10m0s, action badge decreases with popup closed, actual footer links included. The screenshot composition uses that untouched popup; it does not fabricate a native toolbar or live Twitch results. Image sizes1280×800 and440×280 passed; icon alpha bounds[16,16,111,111] confirm exact16px padding around96px artwork.
- Help/privacy checked at390px and1100px with headings, named links and no horizontal overflow. Screenshot, promo and representative page captures were visually reviewed against the existing charcoal/teal design. No new runtime dependencies or permissions; source is public without selecting a license on the publisher’s behalf.
- README contract review: install, controls, release commands/options, image capture, local data disclosures and stack rationale are documented and match implementation. Native permission allow/deny/revoke, live Twitch, sleep/discard throttling, publisher legal/account certifications and store review/install remain manual.

### Public Pages activation receipt

GitHub’s API accepted the same legacy **main / root** Pages configuration used by the Twitch extension, with public base URL https://kevin-mok.github.io/auto-refresh-extension/. At the source commit, the prepared files still require that commit’s push/build before live activation can be claimed. The final post-push check writes **artifacts/pages-receipt.json** with the source commit, anonymous HTTPS statuses, exact source-byte comparisons and URLs for help.html, privacy.html, public.css and referenced icons. Treat an absent/failed receipt as activation pending. The final session handoff reports the observed result; GitHub Pages availability never establishes Web Store approval.

Store listing/privacy/reviewer text: [listing.md](../store-assets/listing.md). Account-backed remaining steps: [release guide](chrome-web-store-release.md). No store item ID or approved listing URL is known or invented.

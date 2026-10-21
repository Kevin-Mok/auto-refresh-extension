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

# Toolbar countdown and timer-first popup

Add a recognizable refresh icon, live remaining seconds on each tab’s toolbar badge, and put Minutes/Seconds first in the popup. Keep the existing exact-page scheduling and charcoal/teal design.

## Atomic plan
- [x] Add defining badge lifecycle tests and observe RED.
- [x] Add icon assets, per-tab badge updates and timer-first popup layout.
- [x] Run regression and real-browser checks; update README and smoke checks.

## Decisions and risks
Use Chrome’s native action badge. Show total remaining seconds (597 means 597 seconds), clear it when inactive, and retain full seconds in the hover title if Chrome clips large values. Chrome controls pinning. Timer throttling can delay visual updates. No new permissions or dependencies.

## Verification and handoff
Verify countdown decreases with popup closed; independent tabs, Stop/Clear/navigation, worker wake, minute/second position and icon loading. Run the full existing suite and browser harness. Roll back by reverting the touched files and reloading the unpacked extension. Commit and push are now authorized by the follow-up commit-session request.

Cursor continuation: Review this plan and the current diff, run npm test and the documented browser harness, then manually check the pinned badge against docs/smoke-tests.md. Suggested commit: feat: show toolbar refresh countdown.

## Review evidence
Defining RED: missing initial `600` badge, absent badge updater, and absent document tick. Read-only independent review found no concrete bugs. Added lifecycle regressions for ceil rounding, overdue zero, pause/resume, navigation, Clear, loading and document tick cancellation. Browser harness now checks actual action badge countdown with popup closed and input placement. README and smoke checks describe pinning, total seconds and throttling limits.

## Final observed verification
- npm test: 25 passed, 0 failed, exit 0 (localhost-enabled execution; sandbox-only demo failure was environmental).
- Real Chromium harness: exit 0. Observed popup-closed badge countdown and blank badge after Stop/Clear, timer-first input ordering, actual 1/29/30-second reloads, independent tabs, SPA navigation, worker wake and browser restart.
- Visual inspection: refreshed icon and popup screenshot show the existing charcoal/teal design with controls first.
- git diff --check: clean. Native pinning/permission prompts, actual background throttling and live Twitch remain manual checks in docs/smoke-tests.md. Implementation verification completed before the commit-session request.

## Delivery milestone — feat: show toolbar refresh countdown
- Scope: direct-write fallback for session 01a1602e-f530-7200-abf0-b33f545e6961. The helper reported unsafe because nested tool writes were not recognized; the first observed git status was clean and every candidate was directly written in this conversation. No pre-existing or unknown changes are included.
- Includes toolbar badge lifecycle, local icon assets, timer-first popup, regression/browser tests, README, smoke checks, verification evidence, tooling incident and this plan.
- Fresh pre-commit npm test: 25/25 passed, exit 0. Runtime code is unchanged since the successful Chromium harness. README contract review passed: install, controls, timing/permissions, command options and stack rationale match the source.
- Status: implementation and documentation complete; no product blockers. Reviewed 19 files staged; exact-index privacy scan passed with the existing private identity policy after sanitizing the tooling report. This milestone is delivered as one commit on main, targeting origin/main; final commit hash and push receipt are reported in the session handoff. Existing ignored output and machine-local directories remain excluded. No deployment applies to this unpacked Chrome extension.
- Remaining manual checks: native pin/permission UI, live Twitch, sleeping/discarded-tab throttling and large-value clipping, as documented in docs/smoke-tests.md. Rollback: revert the commit and reload the extension/pages.

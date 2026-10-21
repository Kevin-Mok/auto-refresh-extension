# Verification tooling compatibility

Record environment-only verification failures while building the extension. The implementation and user browser data are unaffected.

## Evidence and status
- Initial `git status --short` exited 128 because the provided workspace contains a read-only empty `.git` directory, not a repository. This matches the supplied empty-workspace context; no Git operations were attempted at that implementation stage.
- Installed postmortem skill advertises `search --compact`, but the canonical helper rejects that flag (exit 2). Retried the documented helper without this unsupported display flag; search succeeded.
- Lookup: `extension service worker stale timer` returned unrelated Compose, console and configuration findings. None apply to extension scheduling; direct tests provide the evidence instead.
- Status: tooling flag workaround verified; no production failure or data loss. Canonical skill/helper version drift is outside this writable workspace.
- Initial learning registration required a scoped operation outside the workspace; it later succeeded in the canonical ledger. No installed skill copy was modified and no remedy was inferred from unrelated findings.

## Review reproductions
- Review found two scheduling defects before delivery: repeated readiness moved long-interval alarms later without changing the displayed deadline, and Resume reset peer tabs even when the shared interval was unchanged.
- Added explicit regression cases for actual alarm timestamps and unchanged-interval Resume; these are deliberate RED cases. Both regressions now pass; actual browser stop/wake also preserves the countdown.
- Preferred `chrome-devtools-axi pages` could not initialize its bridge (`BRIDGE_NOT_READY`, exit 1). Using installed Playwright with an isolated extension-enabled Chromium profile instead. No changes to the user's active browser or installed tools.
- Browser fixture initially emitted elapsed progress without a listening URL. Root cause: demo server defined `listen()` but never invoked it. Added executable fixture startup and occupied-port tests before fixing. Browser launch had not yet occurred; this was a fixture defect, not Chromium failure. Earlier sandbox and escalated attempts were waiting on fixture readiness.
- Expected RED: demo timestamp test timed out without a listening URL. Occupied-port test also exposed sandbox `listen EPERM 127.0.0.1`; localhost checks require execution outside the network-restricted sandbox. Fix adds the initial listen call; timestamp and occupied-port tests both pass outside the socket-restricted sandbox.
- First real Chromium launch loaded the extension, but the harness tried to identify a tab by URL before granting site access; Chrome correctly omitted that URL without `tabs` permission. Moved tab discovery after the real optional-permission click. Production permission design remains unchanged.
- Headless optional permission click did not complete within 30 seconds; extension loaded and fixture served, but no permission assertion passed. Investigating Chrome's test-only auto-confirm switch; do not interpret this as permission-denial support or product verification.
- Chromium official source confirms install auto-confirm flag does not accept optional host prompts; no supported headless CLI override found. Browser harness now uses a disposable copy with required loopback-only host access. All production code and optional-only delivered manifest remain unchanged. Native allow/deny/revoke UI is explicitly manual coverage, not claimed by this harness.
- Browser harness uncovered an extension-tab messaging gap: popup.html opened as a tab has `sender.tab`, so the content-script dispatch branch swallowed its view/start commands. Normal toolbar popups omit sender.tab. Added a defining background-dispatch test for both trusted contexts; authenticate popup URL before content-script dispatch.
- Final boundary review: a Stop click from a stale popup could cancel the timer of a newly navigated page. Added a deliberate RED test requiring current-page validation before writing a pause or cancelling a schedule.

## Final evidence and shutdown investigation
- Automated suite now passes 22/22; syntax and manifest parse checks pass. Initial complete real-browser run passed all phases including browser restart, exit 0.
- Final repeat passed real popup and 1/29/30-second reload checks, SPA, worker suspension and Clear, but stalled after shutting down the first isolated browser, while waiting for a new worker before navigating a restored page. No final-rerun success is claimed while investigating harness shutdown. Production code changes since the first browser pass are the stale-Stop URL guard only.
- All review fixes have RED→GREEN coverage; screenshot shows the requested popup controls and dark/teal style. Canonical learning registration was completed later as a scoped evidence update.

- Diagnosed repeat-run hang via the harness's process tree: a new isolated Chrome process had already launched. The harness waited for a service worker before opening any page after restart; Chrome can leave that worker asleep until a navigation/content-ready event wakes it. Reordered restored navigation before worker discovery and bounded service-worker waits at 15 seconds. The displayed progress was accurate; earlier shutdown wording was a hypothesis, now corrected.
- Restart harness adjustment also closes all test pages before closing/relaunching the profile, adds lifecycle progress, and uses installed stable Playwright 1.61.1 instead of 1.64 alpha. This is verification tooling only. Obsolete identified test processes were terminated; the user's browser/profile was never targeted.


## Resolution

Final stable-Playwright browser run completed every phase and exited 0. Closing test pages before relaunch and navigating the remembered page before waiting for a worker made restart verification complete; the earlier hang did not establish a production restart defect. Actual popup input, 1/29/30-second reloads, independent tabs, pause persistence, SPA navigation, worker stop/wake, Clear and browser restart all passed. Final evidence is output/playwright/browser-final.log. The 600-second interval was saved/restored but not waited out.

Native allow/deny/revoke UI remains manual because the headless harness explicitly pregrants only loopback in a disposable extension copy. This is the remaining verification limit, alongside live Twitch, sleep/discard/BFCache and accessibility checks in the smoke checklist. Automated suite: 22/22 passed; all source/script syntax checks and manifest parse passed.

Learning decision: project-specific scheduling/dispatch lessons are recorded in tasks/lessons.md; existing current-source/API-boundary/local-socket discipline covers the tooling failures. No additional generalized recovery remedy is inferred. Register this exact completed report hash as reviewed evidence in the canonical ledger, without changing unrelated entries or runtime configuration.


## Public delivery preparation

Git was initialized after the user explicitly requested public publication. Workstation-specific paths were removed from public documentation; private browser profiles and raw verification output remain excluded. This changes delivery metadata only; the extension runtime and observed test results are unchanged. The report's reviewed hash is refreshed in the canonical evidence ledger after this portability update.

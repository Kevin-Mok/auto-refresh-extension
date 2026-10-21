# Extension smoke tests

Load this folder unpacked in Chrome, start the local fixture, then exercise the popup across two tabs, navigation and restarts. Observe the fixture's served timestamp to distinguish real reloads from countdown changes. These are reusable manual checks; actual executed coverage is recorded separately in verification.md.

## Start and interval input

**Action:** Run the demo server, open its printed `/page?demo=1` URL, and open the extension popup. Enter 0 minutes, 600 seconds and Start; allow only the fixture host.

**Expected:** Initially Not started with 10m 0s. After Start, fields normalize to 10m 0s, the page appears in Saved pages and this tab shows Running. The Chrome grant covers the host, but other paths/queries have no rule.

**Action:** Try empty fields, negative values, decimals, exponent notation, 0m 0s, and more than 2,147,483,647 total seconds. Then try 1, 29, 30 and 600 seconds.

**Expected:** Invalid values show an actionable error and leave the saved schedule unchanged. Valid values save and normalize; 1/29 use document timers, 30/600 create one-shot alarms visible in the service-worker console. Observe an actual timestamp change for each interval you wait out.

## Independent tabs and controls

**Action:** Open a second tab at the same exact URL several seconds later. Switch focus back and forth. Stop the first tab, reload it, navigate away and back, then Resume without changing the interval.

**Expected:** Separate deadlines; focus changes preserve them. Only the first tab pauses, including after reload/navigation. Resume starts a full interval only there; the second tab's deadline stays unchanged.

**Action:** Pause the second tab, edit the first tab's interval, then Start.

**Expected:** Running matching tabs restart with the new interval; the second remains paused.

**Action:** Clear auto refresh in the first popup (also try the Saved pages Clear button).

**Expected:** Both tabs remain open, neither reloads, saved entry disappears, pause records vanish and later visits stay Not started.

## Navigation and stale timers

**Action:** Start a 29-second timer. Use fixture SPA away/back buttons before expiry. Repeat with normal links, browser Back, a query change and a fragment change.

**Expected:** Unsaved routes/queries stop scheduling. Returning to the exact saved URL starts a full interval. Fragment-only changes preserve the existing countdown. Old callbacks never reload the different route.

**Action:** Start a 1-second timer and immediately Stop, Clear, or navigate to a different route. Repeat at the expiry boundary.

**Expected:** Once the action is acknowledged, stale callbacks cannot reload that page. No burst of catch-up reloads after suspending/resuming the device.

## Lifecycle and permissions

**Action:** With 30/600-second timers and one paused tab, stop the service worker in `chrome://serviceworker-internals` (do not Reload the extension). Reopen the popup; inspect alarms and deadlines.

**Expected:** Valid deadlines and pauses survive suspension. An existing alarm is not rescheduled later. A missed reload is delivered at most once; Chrome may delay delivery.

**Action:** Fully exit and restart the test browser, then visit the saved exact page.

**Expected:** Saved interval remains. Previous tab pauses are cleared and fresh countdowns start after readiness. Extension Reload/disable/update also clears session state by Chrome design.

**Action:** Deny a Start permission request, retry and allow it, then revoke the site's access in extension settings while a timer runs. Test a Chrome internal page and Chrome Web Store.

**Expected:** No false Running state without an acknowledged document and current grant. Revocation cancels schedules. Saved rules remain available for Start to reauthorize. Unsupported pages disable Start with explanatory status.

## Popup quality

**Action:** Open the popup with a long URL and several saved pages. Use Tab/Shift+Tab and Enter to operate all controls; inspect at normal and increased zoom.

**Expected:** Readable URLs wrap, the saved list scrolls, labels and focus rings remain visible, status is textual, no control overlaps/clips and Clear stays reachable.

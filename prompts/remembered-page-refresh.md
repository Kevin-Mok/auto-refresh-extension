# Remembered page refresh extension

Build or maintain Auto Refresh Cache, a local unpacked Chrome Manifest V3 extension. Read applicable instructions and the implementation plan, then use tests and an isolated browser profile to verify the behavior below. Keep plain bundled HTML, CSS and JavaScript with no runtime framework or backend.

## Behavior

Remember intervals for exact serialized HTTP(S) page URLs including scheme, host, port, path and query; ignore fragments. Save rules locally across restarts. Each tab gets its own full countdown after page readiness, reload or navigation back, including SPA routes. Focus changes must preserve countdowns.

Use a compact charcoal popup with a teal primary action, visible keyboard focus, readable URLs and accessible labels. Show current page, interval, status and countdown. Default unsaved pages to 10m 0s without starting. Accept whole Minutes and Seconds including 600 seconds normalized to 10m 0s; allow 1 through 2,147,483,647 total seconds and reject empty, negative, fractional, zero and unrepresentable values.

Provide Start, Stop this tab, Resume, Clear auto refresh, and a Saved pages list with per-entry Clear. Stop pauses only this tab/page across reload, navigation and worker suspension; browser restart clears pauses. Resume with an unchanged interval must preserve peer deadlines. Interval changes reset running matching tabs while paused peers remain paused. Clear deletes the rule and its pauses, cancels every matching tab's timer, leaves tabs open and prevents future auto-start.

## Scheduling and safety

Use local storage for rules and session storage for tab state. Use per-tab one-shot alarms for intervals of at least 30 seconds and isolated content timeouts below 30 seconds. Request site access directly from the Start gesture, limited to the configured scheme/host. Register scripts persistently for future visits. Use activeTab, storage, alarms, scripting and webNavigation; avoid the broad tabs permission and pregranted broad hosts.

Before any reload validate the current URL, document, saved rule, pause and generation token. Reconcile worker wakes without resetting valid countdowns, and restore fresh tab timers after browser startup. Handle full and SPA navigation, closed tabs, malformed persisted values, permission denial/revocation and unsupported pages without false Running status. Keep everything local. Explain browser timer delays and never replay missed intervals in bursts.

## Verification and handoff

Write defining tests first and observe expected RED before implementation. Use Node's built-in runner for URL/interval/state boundaries and actual Chrome checks for popup, real reloads, independent tabs, SPA navigation and lifecycle behavior. Cover 1/29/30/600 seconds, invalid inputs, Stop/Resume/Clear, worker/browser restarts, permission failure and stale callbacks. Record real observed evidence separately from manual checks not run. Update README, docs/smoke-tests.md, docs/verification.md and plans/remembered-page-refresh.md.

Return the implementation, actual results and limitations, with exactly three direct verification commands and individual expected outcomes. Suggested commit: `feat: add remembered page auto refresh`. Do not publish, add accounts, analytics, sync, domain-wide refresh rules or unrelated refresh features.

# Auto Refresh Cache

A local Chrome extension that remembers an exact page's refresh interval. Set it once, reuse it in new tabs, and pause individual tabs without changing the saved rule. Install the unpacked folder, open a page, then use the extension popup to start its timer.

## Tech stack and why chosen

Manifest V3 runs the background work on demand. Bundled HTML/CSS/JavaScript keeps the popup local and installable without a build. Chrome local/session storage separates remembered page rules from temporary tab state; alarms and isolated document timers cover long and short intervals. Node’s built-in test runner verifies state transitions without dependencies. No runtime packages, account, server, analytics or cloud sync.

[Verification evidence](docs/verification.md) · [Manual smoke checks](docs/smoke-tests.md) · [Implementation plan](plans/remembered-page-refresh.md) · [Store publishing](docs/chrome-web-store-release.md)

## Install

Requires Chrome 120 or later. No build or npm installation is needed to use the extension.

1. Clone this repository or download and extract its ZIP.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the cloned or extracted folder containing `manifest.json`.
4. Pin **Auto Refresh Cache** using Chrome's Extensions menu.
5. Open a normal HTTP(S) page, click the extension icon, enter an interval, and choose **Start**. Allow access to the current site when Chrome asks.

After editing extension files, use Reload on its card in `chrome://extensions`, then reload any already-open test pages. Reloading, disabling or updating an extension clears its session state, including pauses, by Chrome design. To remove it, use Remove on that card. Saved data is extension-local; removing the extension deletes it.

## Controls

- **Toolbar icon:** pin the teal refresh icon through Chrome’s Extensions menu. While this tab runs, its green badge shows total seconds remaining (`597` = 9m 57s), even with the popup closed. Hover for the full number; Chrome may clip long badge values. Paused, cleared and loading tabs have no countdown badge. Background/sleep throttling can delay badge updates.
- **Minutes / Seconds** appear first beneath the popup header, above page details.

- **Start** saves this page's interval and starts this tab. Unsaved pages default to 10 minutes, 0 seconds and remain inactive until Start.
- Enter whole numbers in **both** Minutes and Seconds. Seconds can exceed 59: `0` minutes and `600` seconds normalize to `10` minutes, `0` seconds. Valid totals are 1–2,147,483,647 seconds. Empty, negative, fractional and zero-total inputs are rejected.
- **Stop this tab** pauses only this tab for this page. That pause survives page reloads, navigation away/back, and service-worker suspension. Other tabs continue.
- **Resume** restarts a full interval in this tab. Editing the shared interval restarts all running matching tabs; paused peers stay paused.
- **Clear auto refresh** removes the current page's rule, pauses and schedules from every matching tab. It leaves tabs open; future visits stay inactive. Each Saved pages entry also has a Clear button.

A rule matches the browser's serialized URL including scheme, host, non-default port, path and query. Fragments (`#...`) are ignored. Query ordering, trailing slashes and different paths can identify different pages. Opening the exact page in another tab starts its own full countdown. Full loads, reloads and SPA route returns start a new interval after page readiness; changing tab focus does not reset it. Browser restart retains rules and clears tab pauses.

For example, save `https://www.twitch.tv/directory/category/fortnite` at 10 minutes, 0 seconds. Returning to that exact route or opening it in another tab starts a new 600-second countdown. No other Twitch route receives that rule.

## Permissions and privacy

`activeTab` reads the current page after clicking the icon. `storage` keeps rules locally and per-tab state in session memory. `alarms` schedules intervals of at least 30 seconds. `scripting` installs an isolated timer/guard script. `webNavigation` handles full navigation and SPA route changes. The broad `tabs` permission is not requested.

Optional HTTP(S) host patterns permit asking for just the configured scheme and host from the Start gesture. Chrome site access covers all paths and ports of that host; **refresh matching stays exact-page**. Registered scripts persist across sessions and are removed when no rule needs that site's access. Clear removes refresh rules but does not revoke the Chrome permission; manage grants in Chrome's extension Site access settings.

Denied access does not create a new rule or schedule. Revoked access cancels active schedules and preserves saved rules for reauthorization. Click Start again on the page to restore access. Chrome internal pages, file URLs, the Chrome Web Store and other restricted documents cannot be refreshed. A saved rule alone does not mean Running: the current document must acknowledge its timer.

## Timing limits

Intervals below 30 seconds use an isolated content-script timeout; longer intervals use per-tab one-shot alarms. Chrome can delay either, especially in background tabs, sleeping devices or discarded pages. A countdown reaching zero means a refresh is due, not guaranteed at that instant. Delays cause at most one reload, never bursts of missed reloads. A new interval starts after the resulting page is ready. Service-worker wake preserves valid countdowns and pauses; absent alarms are restored using the existing deadline.

Reloads are guarded by the exact current URL, document ID, rule, pause and schedule token. Stop, Clear and navigation invalidate old callbacks. Like manually reloading a page, automatic reload can discard unsaved page input; use Stop while editing.

## Verify locally

Node 22 or later runs the dependency-free state tests with `npm test`. Tests include interval boundaries, malformed settings, navigation, paused peers, restart reconciliation and stale callbacks. Fixture socket tests need localhost binding permission.

`npm run demo` starts a local page at port 4317 and prints the selected URL. If occupied, it chooses another free port without stopping the existing listener. It prints elapsed activity every 15 seconds. `node scripts/demo-server.js --plain` uses ASCII status output. The page shows a server timestamp and full-navigation/SPA controls for manual reload checks. Stop the server with Ctrl+C.

For automated browser checks, provide an installed Playwright module and an extension-capable Chromium binary to `node scripts/browser-check.js --playwright /absolute/path/to/playwright/index.mjs --chromium /absolute/path/to/chrome`. Alternatively install Playwright as a local development tool and omit `--playwright`; no runtime dependency is added to the extension. `--plain` removes decorative status glyphs; `--details` shows raw failure diagnostics and `--help` lists the invocation. The harness uses a temporary browser profile, local server and disposable extension copy with loopback host access pregranted (headless Chrome cannot accept the native permission prompt). Native allow/deny/revoke remains a manual check against the original manifest. It cleans up its profile/copy/server and saves an ignored screenshot under `output/playwright/`. See [verification evidence](docs/verification.md) and [manual smoke checks](docs/smoke-tests.md) for actual coverage and remaining checks.

## Chrome Web Store publishing

The [release guide](docs/chrome-web-store-release.md) contains the remaining account/dashboard steps. The [listing kit](store-assets/listing.md) includes store copy, every permission justification, local URL/data disclosures and reviewer instructions. Public [Help](https://kevin-mok.github.io/auto-refresh-extension/help.html) and [Privacy](https://kevin-mok.github.io/auto-refresh-extension/privacy.html) pages are bundled and prepared for GitHub Pages; their activation receipt is recorded separately from Web Store approval. No store listing URL or approval is claimed yet.

Run `python3 scripts/release.py package` to create `artifacts/auto-refresh-cache-1.0.0.zip` and a validated unpacked folder beside it. `python3 scripts/release.py inspect artifacts/auto-refresh-cache-1.0.0.zip` checks the exact 15-file runtime allowlist, dependencies and icon sizes and prints its SHA256. Both subcommands support `--plain` for ASCII output and `--help`; no credentials, client ID or extra build dependency are needed. A changed existing install folder is protected from overwrite: move that generated folder aside after checking it or use a new release version. ZIPs and extracted candidates stay ignored.

Upload the ZIP, padded 128px icon, 440×280 promo and 1280×800 screenshot using [the asset notes](store-assets/README.md). `node scripts/capture-store.mjs --help` describes repeatable genuine-popup capture; it accepts `--playwright`, `--chromium` and `--plain` like the browser harness. The source is publicly inspectable; this task does not select a license or claim a security audit. Native site permission acceptance and final publisher certifications remain manual.

## Project map

- `src/rules.js`: URL, interval and persisted-rule validation.
- `src/engine.js`: state transitions and Chrome scheduling boundary.
- `src/background.js`: queued browser events and authenticated messages.
- `src/content.js`: document readiness, short timers, toolbar countdown ticks and final reload guard.
- `icons/`: bundled refresh icon sizes and editable SVG source.
- `popup.html`, `popup.css`, `src/popup.js`: local, accessible dark popup.
- [Implementation plan](plans/remembered-page-refresh.md), [portable build prompt](prompts/remembered-page-refresh.md).

The GitHub repository is named **auto-refresh-extension**; the installed extension appears in Chrome as **Auto Refresh Cache**.

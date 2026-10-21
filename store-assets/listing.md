# Chrome Web Store listing copy

Copy these prepared fields into the Chrome Web Store dashboard after reviewing the candidate, images and privacy policy. The text describes version 1.0.0; adjust dashboard category labels to what is actually offered and certify the declarations yourself.

## Store listing

**Name:** Auto Refresh Cache

**Summary (matches the manifest):** Remember exact-page refresh intervals with independent tab timers and pauses.

**Language:** English (United States).

**Category:** Productivity / Tools, or the closest matching tools category offered by the dashboard.

**Detailed description:**

Remember the page. Refresh on repeat.

Set a refresh interval once and Auto Refresh Cache remembers it for that exact page. Return later or open the same page in another tab to start a new, independent timer.

• Minutes and Seconds are first in the popup, with clear Start, Stop and Resume controls.
• The toolbar badge shows total seconds remaining, even while the popup is closed.
• Pause one tab while other tabs continue refreshing.
• Clear a saved page to remove its timers across matching tabs.
• Saved page rules stay on your device across browser restarts.
• No account, analytics, advertising or publisher backend.

Grant access only when starting a timer on a site. Chrome grants site access across that host, while refresh rules match the exact URL, including its path and query. URL fragments are ignored.

Chrome can delay refreshes and badge updates in background tabs or on sleeping devices. Automatic reloads can discard unsaved input, so pause while editing. Chrome internal pages and other restricted pages are unsupported.

Page URLs and intervals are stored locally. The publisher does not receive them. Normal refreshes still contact the destination website as a normal page load would. Read the privacy policy for details.

Source: https://github.com/Kevin-Mok/auto-refresh-extension
Support: https://github.com/Kevin-Mok/auto-refresh-extension/issues

## Links

| Dashboard field | Value |
| --- | --- |
| Homepage / website | https://kevin-mok.github.io/auto-refresh-extension/help.html |
| Support URL | https://github.com/Kevin-Mok/auto-refresh-extension/issues |
| Privacy policy URL | https://kevin-mok.github.io/auto-refresh-extension/privacy.html |
| Source code, where supported | https://github.com/Kevin-Mok/auto-refresh-extension |

Use the hosted links only after the release guide records successful anonymous HTTPS checks. Do not substitute an authenticated dashboard, local file or invented store listing URL.

## Privacy practices

**Single purpose:** Refresh user-selected web pages at a chosen interval and remember each exact page’s interval across browser restarts, with independent tab timers and pauses.

**Permission justifications:**

| Permission | Paste-ready justification |
| --- | --- |
| activeTab | Read the current page URL after the user clicks the toolbar action, so the popup can show and configure the exact page without requesting the broad tabs permission. |
| storage | Save exact page URLs and refresh intervals in extension-local storage; keep temporary tab deadlines, document IDs, schedule tokens and pauses in session storage. No extension sync or publisher transmission is used. |
| alarms | Deliver one-shot refresh timers of at least 30 seconds and restore missing timers after the service worker wakes. |
| scripting | Register and inject bundled isolated document timers and reload guards on sites the user grants. This supports short timers and validates the current document/URL before reload. No remote code is injected. |
| webNavigation | Detect full-page and single-page-app navigation so saved exact-page rules can restart after readiness and stale timers cannot refresh another page. This does not read Chrome’s history database. |
| Optional http://*/* and https://*/* host access | The user can choose any ordinary HTTP(S) page. Wildcard patterns declare the sites that may be requested; Start requests only the chosen scheme and host through Chrome’s native prompt. Persistent user-granted site access is needed to restore saved rules after browser restart and run isolated guards in future matching tabs. Rules remain exact-page even though Chrome’s host grant spans paths and ports. No all-sites grant is requested by the normal Start flow. |

**Remote code:** No, I am not using remote code. All executable JavaScript and styles are packaged locally; normal target pages keep loading their own website content.

**Data categories:** Disclose **Web browsing activity**, because the extension processes page/navigation URLs and stores exact saved page URLs on-device. Refresh intervals are local configuration. Do not describe local URL handling as “no data handled.” No page-content scraping, credentials, location, finances, health data, analytics or publisher uploads are implemented.

**Data-use explanation:** Exact page URLs and refresh settings are used solely for user-selected refreshing. They stay in the browser’s extension storage and are not transmitted to the publisher, sold, shared for advertising, or used for credit/lending. Temporary scheduling state stays in session memory. Destination websites receive normal reload requests under their own policies.

Review the actual dashboard’s category definitions against the final candidate and policy; the publisher must confirm the limited-use certifications and account/trader declarations. Do not select a checkbox that contradicts the code or policy. See [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [user-data policy FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).

## Reviewer test instructions

No login, subscription, backend, API key or test credentials are required.

1. Install the uploaded candidate. Pin Auto Refresh Cache through Chrome’s Extensions menu.
2. Open https://example.com/ (or another ordinary HTTP(S) page), open the extension, enter 0 Minutes and 10 Seconds, then choose Start. Allow the current site through Chrome’s native prompt.
3. Confirm Running, a saved page entry and a decreasing seconds badge with the popup closed. Observe the tab reloading; Chrome may delay background timers. Reopen the popup.
4. Choose Stop this tab. The badge clears and further refreshes stop. Resume starts a full interval.
5. Open the exact same URL in a second tab to check its independent timer. Pausing one tab leaves the other running.
6. Clear auto refresh. The saved rule and matching tab timers disappear. Chrome’s site grant remains separately manageable in extension settings.
7. Open Help and Privacy from the popup footer. For an unsupported chrome:// page, Start is disabled with a status explanation.

For timestamp-based local acceptance, the repository provides a demo server, but it is not required to review or use the extension. Native host permission prompts and real background/sleep behavior must be checked in ordinary Chrome, not inferred from the automated pregranted fixture.

## Publisher-only fields

Use the existing publisher account used for the Twitch extension. Verify its contact email, 2-Step Verification, applicable identity/trader declarations, regions and distribution choice in the dashboard. No private email or account information is embedded in this repository. Start Unlisted if you want a beta; choose Public when ready. Do not reuse the Twitch item ID for this separate extension.

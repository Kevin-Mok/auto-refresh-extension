# Publish Auto Refresh Cache in the Chrome Web Store

This guide takes the prepared 1.0.0 candidate through installation checks and the remaining store dashboard steps. Use the ZIP and store assets below, review the hosted privacy policy, then create a separate store item in the existing publisher account, complete its disclosures and submit for review.

The sibling Twitch project supplied the pattern: explicit runtime-only package, public help/privacy pages, separate listing assets and manual publisher acceptance. This extension needs no OAuth client ID, account connection or backend. GitHub source/Pages publication and Chrome Web Store approval are separate outcomes.

## Prepared files

| Purpose | File |
| --- | --- |
| Upload candidate | `artifacts/auto-refresh-cache-1.0.0.zip` |
| Install the exact candidate unpacked | `artifacts/auto-refresh-cache-1.0.0/` |
| Store icon | `icons/refresh-128.png` |
| Required small promotional tile | `store-assets/promo-440x280.png` |
| Product screenshot | `store-assets/screenshot-1280x800.png` |
| All listing, privacy and reviewer text | [store-assets/listing.md](../store-assets/listing.md) |
| Help and data handling source | [help.html](../help.html), [privacy.html](../privacy.html) |
| Manual acceptance cases | [smoke-tests.md](smoke-tests.md) |

The ZIP is generated and ignored; upload it, not a GitHub source archive. Store images are uploaded separately. The package contains only 15 runtime files, with manifest.json at its root; tests, scripts, source SVGs, docs, store images, Git metadata and local artifacts are excluded. The builder validates dependencies, icons, archive paths and repeated-build bytes. It does not establish store approval or replace publisher review. [Chrome ZIP preparation](https://developer.chrome.com/docs/webstore/prepare/).

## Rebuild and inspect

Working directory: this repository root. No sudo. Python 3 builds the dependency-free release; Node 22+ runs the tests. The Python builder has package and inspect subcommands and --plain for ASCII status output. It has no credential or client-ID option.

python3 scripts/release.py package

Expected example:
```text
Auto Refresh Cache 1.0.0
Validated 15 allowlisted files, local dependencies, and icon dimensions
ZIP: .../artifacts/auto-refresh-cache-1.0.0.zip
SHA256: <64-character hash>
```

python3 scripts/release.py inspect artifacts/auto-refresh-cache-1.0.0.zip

Expected example:
```text
Validated 15 allowlisted files, local dependencies, and icon dimensions
```

An identical build is repeatable. If the extracted candidate has changed, the builder refuses to overwrite it. Move that generated folder aside after checking it, or increase the version for a real release update; never delete an unknown installation folder. Later store uploads for the same item must use an increased manifest version. [Chrome update procedure](https://developer.chrome.com/docs/webstore/update/).

## Check the candidate in your Chrome profile

1. Open chrome://extensions and enable Developer mode.
2. Temporarily disable the older duplicate unpacked copy so you do not use the wrong icon. Do not remove it if you need its saved rules: installation paths have independent development identities/storage.
3. Choose Load unpacked and select the extracted candidate folder above.
4. Pin Auto Refresh Cache. Open an ordinary page, set 0 minutes / 10 seconds, Start and allow the site. Close the popup: the badge should count down and the tab should refresh. Verify Stop, Resume and Clear. Exercise the host allow/deny/revoke and saved-rule restart checks in [smoke-tests.md](smoke-tests.md).
5. Open Help and Privacy from the footer. Confirm the policy matches your intended publisher identity and contact method. Clear test rules or disable the development candidate afterward.

Automated browser checks use a disposable copy with loopback permission pregranted because headless Chrome cannot accept the native host prompt. This does not prove native consent UI or background/sleep behavior.

## Public URLs

- Website/help: https://kevin-mok.github.io/auto-refresh-extension/help.html
- Privacy: https://kevin-mok.github.io/auto-refresh-extension/privacy.html
- Support: https://github.com/Kevin-Mok/auto-refresh-extension/issues
- Source: https://github.com/Kevin-Mok/auto-refresh-extension

The Pages publication receipt and package hash belong in [verification.md](verification.md). Check that help/privacy open without sign-in before submission. If Pages needs repair, use repository Settings → Pages → Deploy from a branch → main / root, matching the Twitch project. No website backend is needed.

## Finish in the Chrome Web Store dashboard — manual

1. Open the [developer dashboard](https://chrome.google.com/webstore/devconsole) using the same publisher account as the Twitch extension. Reuse its registration; complete any outstanding account/contact, 2-Step Verification and applicable trader/identity declarations shown there. Do not pay another registration fee unless Google actually requires registration for this account. [Account setup](https://developer.chrome.com/docs/webstore/set-up-account/).
2. Choose **Add new item** and upload **artifacts/auto-refresh-cache-1.0.0.zip**. This is a separate extension: do not upload it as an update to the Twitch item. Record the new item ID and keep it for future updates.
3. In **Store listing**, paste the name, description, language, category and links from [listing.md](../store-assets/listing.md). Upload the 128×128 icon, 440×280 promo and 1280×800 screenshot. The screenshot uses a genuine local-fixture popup capture; review its evidence in [store-assets/README.md](../store-assets/README.md). Chrome currently requires an icon, small promo and at least one screenshot; up to five screenshots can be supplied. [Image requirements](https://developer.chrome.com/docs/webstore/images/).
4. In **Privacy practices**, paste the single purpose and each permission justification from listing.md, including optional host access. Select no remote code. Disclose **Web browsing activity** for the locally handled/stored page URLs, enter the live privacy-policy URL, and personally review/confirm the limited-use certifications. Local processing still counts as data handling under Chrome’s policy. [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [data handling FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/).
5. Add the prepared reviewer instructions if the dashboard offers that field. There are no test credentials to supply. Select desired countries/regions and **Unlisted** for a beta or **Public** for general availability. Public means anybody can discover/install; Unlisted means anyone with the URL can install, rather than restricted private access. [Distribution](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution).
6. Resolve dashboard validation errors, then choose **Submit for review**. Deferred publication lets you decide when to launch after approval; Google currently requires publishing an approved deferred submission within 30 days or submitting it for review again. Submission and approval are not an automatic public launch. [Publish](https://developer.chrome.com/docs/webstore/publish/).
7. After approval, publish the item, install it from its actual store URL in a clean profile and repeat the core Start/badge/Stop/Clear checks. Add the real store URL, item ID, released version and ZIP hash to README and verification.md. No store ID or approval has been fabricated here.

## Current acceptance status

- Local release preparation and verification: recorded in [verification.md](verification.md) and [the release plan](../plans/web-store-release.md).
- Public static URL activation: see the exact Pages receipt in verification.md.
- Publisher policy/account declarations, native permission acceptance, dashboard upload, review, publication and store-install acceptance: manual, not complete merely because a ZIP exists.

The source is public for inspection. No license was selected as part of this task, so the listing does not claim MIT licensing, an independent security audit or guaranteed safety/timing.

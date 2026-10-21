# Store assets

Upload these required images separately from the release ZIP. Review the genuine product capture, copy the matching listing text and follow the dashboard checklist in the release guide.

- `promo-440x280.png`: small promotional tile using the extension’s existing charcoal/teal palette and original refresh mark. No Google/Twitch logo, licensing, approval or audit claim.
- `screenshot-1280x800.png`: store-ready composition containing an untouched genuine extension-popup capture, with explanatory text outside the capture. It shows the final packaged 1.0.0 candidate Running after entering 600 seconds, normalized to 10 minutes / 0 seconds; Help and Privacy are visible in the footer. The displayed URL is a local timestamp fixture. It is not a live Twitch/account screenshot. The toolbar is not fabricated; the badge feature is described in copy and independently verified through Chrome’s real action API.
- `popup-running.png`: original popup PNG used in that composition. Keep it as the capture source; upload the correctly sized 1280×800 composition to the store.
- `../icons/refresh-128.png`: 128×128 store icon with exactly 16 transparent pixels around 96×96 artwork. Smaller toolbar icons remain intact.
- `listing.md`: paste-ready listing, permissions, local URL/data disclosures and reviewer instructions.

## Reproduce the images

Build the release candidate first. `scripts/capture-store.mjs` loads that extracted candidate in a fresh temporary Chromium profile. The disposable copy alone pregrants loopback, starts the genuine popup against the local fixture, verifies Running/normalization and decreasing action badge with the popup closed, captures the UI, and renders the two store images. It also verifies help/privacy at 390px and 1100px, image dimensions and icon transparency bounds. Normal browser data is never used.

The script takes the same `--playwright` module and `--chromium` binary paths as the browser harness, with `--plain` for ASCII output and `--help` for usage. No new dependency is installed; provide existing Playwright/Chromium tools. Raw QA pages go under ignored `output/playwright/`. Captures show the actual random loopback port and current countdown, so those image pixels can change between runs. The runtime ZIP remains byte-reproducible for unchanged source.

node scripts/capture-store.mjs --help

Expected example:
```text
Store artwork: node scripts/capture-store.mjs [--playwright /path/to/index.mjs] [--chromium /path/to/chrome] [--plain]
```

After runtime-file edits, rebuild/move the old generated install folder as described in the release guide, rerun capture, visually review the images, and confirm the candidate’s 15 files match the final source. Native permission consent, live Twitch and sleep/background throttling remain manual checks.

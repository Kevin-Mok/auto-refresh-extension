# Engineering lessons

- Preserve the actual Chrome alarm when reconciling an existing schedule token; retaining only the displayed due time does not preserve delivery time.
- Resume with an unchanged saved interval restarts only the invoking tab. Reset peers only when changing the shared interval.
- Authenticate the trusted extension popup URL before classifying tab-originated content messages; popup.html can also be opened as an extension tab during verification.
- Revalidate the current tab URL before Stop mutates pause/schedule state; a popup can outlive navigation.
- Headless optional-permission prompts require manual coverage or an explicitly documented pregranted fixture copy. A Web Store install auto-confirm flag does not exercise native runtime host grants.

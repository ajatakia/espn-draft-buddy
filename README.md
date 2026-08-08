# ESPN Draft Buddy

A Chrome extension that overlays a tiered player rankings panel on ESPN's live fantasy football draft room, and automatically checks players off as they get drafted.

## Features

- Import your own tiered rankings (paste/upload JSON or CSV) — fully local, no external rankings service.
- Floating, draggable overlay panel injected directly into the ESPN draft room (not a popup that closes on outside click).
- Search/filter players, collapsible tiers.
- Auto-detects drafted players by watching the ESPN draft board in real time.
- **Manual click-to-toggle always works**, even if auto-detection isn't tuned to ESPN's current DOM yet — see [Known limitation](#known-limitation-auto-detection) below.
- "Unmatched picks" section lets you manually link a scraped name to a player if auto-matching misses (e.g. due to name spelling differences), and remembers that link for the rest of the draft.
- "Reset Draft" clears drafted-state only — your imported rankings are untouched.

## Install (unpacked, for development/personal use)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repo's root folder.
4. Click the extension icon → **Import rankings…** to open the options page and paste/upload your tier list (see [`docs/json-format.md`](docs/json-format.md) or [`docs/csv-format.md`](docs/csv-format.md)).
5. Open a live ESPN fantasy football draft room (`fantasy.espn.com/football/...draft...`) — the overlay panel should appear.

## Known limitation: auto-detection

This extension was built without live access to ESPN's draft room DOM, so the CSS selectors used to scrape drafted-player names (`src/content/selectors.js`) are **best-effort placeholders**, not verified against the real page. Auto-detection may not fire until those selectors are updated.

This is by design not a blocker: the overlay is fully usable via **manual click-to-toggle** from the moment you import a tier list, regardless of whether auto-detection works.

To fix auto-detection: run a real or mock draft, inspect the DOM via Chrome DevTools, and fill in [`docs/espn-dom-notes.md`](docs/espn-dom-notes.md) with the real markup. Then update `src/content/selectors.js` accordingly — that's the only file (plus, rarely, the small extraction calls in `src/content/draft-observer.js`) that should need changes.

## Project structure

```
manifest.json
src/
  background/service-worker.js   # install defaults, badge
  content/                       # injected into the ESPN draft page
    content-script.js            # entry point
    draft-observer.js            # MutationObserver-based pick scraper
    selectors.js                 # ESPN DOM hooks (see Known limitation)
    overlay.js / overlay-styles.js  # shadow-DOM floating panel
  options/                       # import UI (paste/upload JSON or CSV)
  popup/                         # toolbar popup (toggle overlay, reset, import link)
  shared/                        # storage, CSV parsing, name matching, schema validation
docs/                            # format references + DOM inspection notes
```

## Data storage

Everything is stored locally via `chrome.storage.local` — no network requests, no external servers. See `src/shared/storage.js` for the storage keys used.

## License

Personal-use project; no license specified.

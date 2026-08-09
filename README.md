# ESPN Draft Buddy

A Chrome extension that overlays a tiered player rankings panel on ESPN's live fantasy football draft room, and automatically checks players off as they get drafted.

## Features

- Import your own tiered rankings (paste/upload JSON or CSV) — fully local, no external rankings service.
- Floating, draggable overlay panel injected directly into the ESPN draft room (not a popup that closes on outside click).
- Search/filter players, collapsible tiers.
- Auto-detects drafted players by watching the ESPN draft board in real time — including picks made before you opened the extension.
- **Manual click-to-toggle always works** as a backstop, whatever auto-detection does.
- "Unmatched picks" section lets you manually link a scraped name to a player if auto-matching misses (e.g. due to name spelling differences), and remembers that link for the rest of the draft.
- "Reset Draft" clears drafted-state only — your imported rankings are untouched.

## Install (unpacked, for development/personal use)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this repo's root folder.
4. Click the extension icon → **Import rankings…** to open the options page and paste/upload your tier list (see [`docs/json-format.md`](docs/json-format.md) or [`docs/csv-format.md`](docs/csv-format.md)).
5. Open a live ESPN fantasy football draft room (`fantasy.espn.com/football/...draft...`) — the overlay panel should appear.

## Included starter rankings

[`data/fantasylife-consensus.csv`](data/fantasylife-consensus.csv) is a ready-to-import list: 455 players across 10 tiers, from a FantasyLife consensus board. Upload it on the options page to get going without building your own list. Bye weeks are carried in the `notes` column, and team defenses are written in ESPN's `Lions D/ST` form so they auto-match.

## Auto-detection

Verified against a real ESPN draft room. The content script watches the **draft board grid** (`.draft-board-grid-pick-cell.completedPick`), not the pick-history table — the latter is virtualized and only holds one round's visible rows, while the grid carries every pick in the DOM at once. That's also why picks made before you loaded the extension get caught up on the first scan.

Measured against a completed 170-pick draft using the included rankings, **168 of 170 picks matched automatically**. The two misses were nickname differences between sources (ESPN's `Kenny Gainwell` vs. the rankings' `Kenneth Gainwell`; `Woody Marks` vs. `Jo'quavioius Marks`) — the kind of thing the "Unmatched Picks" section exists for: one click links the name, and it sticks for the rest of the draft.

All ESPN-specific selectors live in [`src/content/selectors.js`](src/content/selectors.js), with the full markup reference and gotchas in [`docs/espn-dom-notes.md`](docs/espn-dom-notes.md). If ESPN redesigns, that one file is normally the only thing to update.

## Development notes

Content scripts declared in `manifest.json` are always injected as **classic** scripts — `"type": "module"` is not a supported key there, and a content script using static `import` fails outright with *"Cannot use import statement outside a module."* This extension keeps its ES-module layout by having `src/content/loader.js` (classic) dynamically `import()` the real entry point, with the module files exposed through `web_accessible_resources`. Don't "simplify" that back into a direct module content script.

Similarly, `chrome.runtime.openOptionsPage()` is not exposed to content scripts; the overlay's **Import…** button messages the background worker, which opens it.

Both of those failures are invisible to linting and only surface in a real browser, so there's an end-to-end check that loads the unpacked extension into Chromium and drives it:

```bash
npm i -g playwright
node test/e2e.mjs /path/to/saved-espn-draft-page.html
```

Save the fixture yourself from a draft room (Cmd/Ctrl+S → "Web page, HTML only"). It isn't committed, because a saved draft page contains your league and team names.

## Project structure

```
manifest.json
src/
  background/service-worker.js   # install defaults, badge
  content/                       # injected into the ESPN draft page
    loader.js                    # classic-script stub that imports the entry point
    content-script.js            # entry point
    draft-observer.js            # MutationObserver-based pick scraper
    selectors.js                 # ESPN DOM hooks (verified)
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

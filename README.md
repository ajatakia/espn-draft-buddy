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
4. Open a live ESPN fantasy football draft room (`fantasy.espn.com/football/...draft...`) — the overlay appears with the bundled rankings already loaded.

To use your own rankings instead, click the extension icon → **Import rankings…** and paste or upload your list (see [`docs/json-format.md`](docs/json-format.md) or [`docs/csv-format.md`](docs/csv-format.md)).

## Bundled rankings (loaded by default)

[`data/fantasylife-consensus.csv`](data/fantasylife-consensus.csv) — 455 players across 10 tiers from a FantasyLife consensus board — ships with the extension and is **loaded automatically on install**. There's nothing to import to get started. Bye weeks ride along in the `notes` column, and team defenses are written in ESPN's `Lions D/ST` form so they auto-match.

Importing your own list replaces it, and an existing list is never overwritten on update — so if you upgrade from a version that predates this, click **Load bundled rankings** on the options page to pull in the current file.

## Auto-detection

Verified against a real ESPN draft room. The content script watches the **draft board grid** (`.draft-board-grid-pick-cell.completedPick`), not the pick-history table — the latter is virtualized and only holds one round's visible rows, while the grid carries every pick in the DOM at once. That's also why picks made before you loaded the extension get caught up on the first scan.

### Name matching

Sources disagree about first names — ESPN says `Kenny Gainwell`, the rankings say `Kenneth Gainwell`; ESPN says `Woody Marks`, the rankings say `Jo'quavioius Marks`. So matching is a ladder, stopping at the first hit:

1. a manual override you set by resolving an earlier unmatched pick
2. exact normalized name (case, punctuation, and `Jr./Sr./III` suffixes removed)
3. last name + position + team
4. last name + position

Steps 3 and 4 accept a candidate **only if it's unique**. Marking the wrong player drafted is worse than leaving one unmatched, so an ambiguous last name falls through to the unmatched list instead of guessing — `robinson|RB` (Bijan vs. Brian) and `brown|WR` (four of them) are among 29 such keys in the bundled rankings, and none of them will fuzzy-match without a distinguishing team. A wrong position never matches at all.

Against a completed 170-pick draft with the included rankings, **170 of 170 matched** — 168 exact, 2 via last name + position + team.

Anything that still misses lands in the **"Drafted, not in your list"** section pinned to the top of the panel, where one click links it for the rest of the draft.

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

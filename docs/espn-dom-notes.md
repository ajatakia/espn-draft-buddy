# ESPN draft room DOM notes

**Status: verified.** These selectors were confirmed against a real saved ESPN fantasy football draft room page (2026 season, 10-team / 17-round league, 170 completed picks). `src/content/selectors.js` reflects what's documented here.

## Scraping target: the draft board grid (not pick history)

There are two places picks appear in the draft room. Only one is usable:

| | Pick history table | **Draft board grid** |
|---|---|---|
| Markup | `.pick-history-table` → react `fixedDataTable` | `.draftBoardGrid` → `.draft-board-grid-pick-cell` |
| Completeness | **Virtualized** — one round at a time, only rows scrolled into view | **All picks at once** (170/170 present in the DOM) |
| Available when tab inactive | n/a | Yes — cells stay populated |
| Verdict | Unusable | **What we scrape** |

The grid is the better target on every axis, most importantly that picks made *before* the extension loaded are still in the DOM, so joining a draft late works.

## Markup of one completed pick

```html
<div class="draft-board-grid-pick-cell completedPick" style="grid-area: 1 / 1; --position-color: 1, 199, 242;">
  <div class="pickCellTop">
    <div class="roundPick">1.1</div>
  </div>
  <div class="pickCellMiddle">
    <span class="playerFirstName">Puka</span>
    <span class="playerLastName">Nacua</span>
  </div>
  <div class="pickCellBottom">
    <span class="playerProTeam">LAR</span>
    <span class="positionPill">WR</span>
    <span class="byeWeek">(11)</span>
  </div>
</div>
```

Container chain: `.draftBoardGrid` → `.draftBoardGrid__container` → `.draftBoard`.

## Gotchas worth knowing

1. **The name is split across two spans with no whitespace between them.** Reading `.pickCellMiddle.textContent` yields `"PukaNacua"`. The first and last name must be read from `.playerFirstName` / `.playerLastName` separately and joined with a space. This is handled in `draft-observer.js` (`readPick`).

2. **`completedPick` is the "has been drafted" flag.** Cells for future picks exist in the grid but lack this class, so the observer selects `.draft-board-grid-pick-cell.completedPick`. Because a pick is registered by a *class change on an existing node* (not a new node being appended), the MutationObserver must watch `attributes` with `attributeFilter: ['class']` — `childList` alone would miss picks.

3. **`.roundPick` (e.g. `"3.7"`) is a stable unique id per pick.** It's used as the dedup key so repeated scans are cheap no-ops.

4. **DOM order is not pick order.** Cells are laid out by `grid-area` (team column × round), so the grid reads `1.1, 2.10, 3.1, 4.10…`. Nothing should rely on document order.

5. **The board tab can be inactive** (`tab__item dn`, Tachyons `display:none`) and the cells are still fully populated — scraping works regardless of which tab the user is on.

6. **ESPN keeps name suffixes; some ranking sources strip them.** ESPN shows `Marvin Harrison Jr.`, `Kenneth Walker III`, `Kyle Pitts Sr.`. `normalizePlayerName()` strips trailing `Jr/Sr/II/III/IV/V`, so these match sources that omit them.

7. **Defenses are `"<Nickname> D/ST"`** — `Lions D/ST`, `Steelers D/ST` — with `.playerProTeam` holding the abbreviation (`DET`, `PIT`). Ranking sources that list `"Detroit Lions"` will not match; `data/fantasylife-consensus.csv` is written in ESPN's form.

8. **Team abbreviations differ between sources.** ESPN uses `LAR`, `WSH`, `JAX`; some ranking sites use `LA`, `WAS`, `JAC`. This is display-only and does not affect matching, which is name-based.

## Re-verifying after an ESPN redesign

If auto-detection stops working, open a draft room in DevTools and confirm the class names above still exist. In almost all cases only `src/content/selectors.js` needs updating — the observer, matching, and overlay code are selector-agnostic.

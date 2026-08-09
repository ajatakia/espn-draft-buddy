// ============================================================================
// STATUS: VERIFIED against a real ESPN fantasy football draft room snapshot
// (saved "Fantasy Football Draft - ESPN" page, 2026 season).
//
// The scraping target is the DRAFT BOARD GRID, not the pick-history table.
// That choice matters:
//   - The pick-history table is a virtualized fixed-data-table (react
//     fixed-data-table) that renders one round at a time and only the rows
//     currently scrolled into view — so most picks are absent from the DOM.
//   - The draft board grid renders ALL pick cells for the whole draft at once
//     (170 cells for a 10-team/17-round league in the reference snapshot),
//     including picks made before the extension loaded. It also stays
//     populated while its tab is inactive, so scraping works no matter which
//     tab the user is looking at.
//
// Reference markup for one completed pick:
//
//   <div class="draft-board-grid-pick-cell completedPick" style="grid-area: 1 / 1;">
//     <div class="pickCellTop"><div class="roundPick">1.1</div></div>
//     <div class="pickCellMiddle">
//       <span class="playerFirstName">Puka</span>
//       <span class="playerLastName">Nacua</span>
//     </div>
//     <div class="pickCellBottom">
//       <span class="playerProTeam">LAR</span>
//       <span class="positionPill">WR</span>
//       <span class="byeWeek">(11)</span>
//     </div>
//   </div>
//
// NOTE: the first and last name live in SEPARATE spans with no whitespace
// between them, so `pickCellMiddle.textContent` yields "PukaNacua". The name
// must be assembled from the two spans — see draft-observer.js.
//
// If ESPN changes their markup, this file is the first place to update.
// See docs/espn-dom-notes.md.
// ============================================================================

export const SELECTORS = {
  // Root container of the draft board grid. Used as the observer target when
  // present; the observer falls back to document.body until it appears.
  draftBoardGrid: '.draftBoardGrid',

  // A pick cell that has actually been drafted. Cells for future picks exist
  // in the grid too but lack the `completedPick` class, which is what makes
  // this a reliable "has been drafted" filter.
  completedPickCell: '.draft-board-grid-pick-cell.completedPick',

  // Within a completed pick cell:
  roundPick: '.roundPick', // e.g. "1.1" — stable unique id for the pick
  playerFirstName: '.playerFirstName',
  playerLastName: '.playerLastName',
  playerProTeam: '.playerProTeam',
  positionPill: '.positionPill',
};

export const SELECTOR_STATUS = {
  verified: true,
  lastUpdated: '2026-08-09',
  notes:
    'Verified against a saved ESPN draft room page (170 completed picks). Targets the draft board grid because the pick-history table is virtualized.',
};

// ============================================================================
// STATUS: UNVERIFIED. Every selector below is a best-effort placeholder based
// on typical React-app markup conventions, NOT confirmed against ESPN's real
// draft room DOM (no live browser access to fantasy.espn.com was available
// while building this extension).
//
// This is the ONLY file (plus, if a pick element's internal structure truly
// differs, the small extraction calls inside draft-observer.js's scan()) that
// should need edits after real-world validation. The observer/diff/matching
// machinery is written to be selector-agnostic.
//
// How to update: during a real or mock ESPN draft, open DevTools, inspect the
// pick-history list, and record findings in docs/espn-dom-notes.md. Then
// update the values below and flip SELECTOR_STATUS.verified to true.
// ============================================================================

export const SELECTORS = {
  // Any element that reliably indicates "we're on the live draft room" page
  // (beyond the URL path check already done in content-script.js).
  draftRoomMarker: '[class*="draftRoom" i], [class*="draft-room" i], [data-testid*="draft" i]',

  // The scrollable container that lists picks as they happen (sometimes
  // called "Recent Picks" / pick history / draft board).
  pickHistoryContainer: '[class*="pickHistory" i], [class*="draft-pick-list" i], [class*="recentPicks" i], [data-testid*="pick-list" i]',

  // Individual pick row/card within the container above.
  pickHistoryItem: 'li[class*="pick" i], div[class*="pick" i][class*="row" i], div[class*="pick" i][class*="card" i]',

  // Player's name text within a pick item.
  playerNameInPick: '[class*="player" i][class*="name" i], [class*="playerinfo__playername" i]',

  // Player's team/position text within a pick item (e.g. "RB - SF").
  playerTeamPosInPick: '[class*="player" i][class*="detail" i], [class*="playerinfo__playerpos" i], [class*="playerinfo__playerteam" i]',

  // Optional: element showing whose turn it is, useful for future features
  // (e.g. highlighting the on-deck window) — not required for v1 detection.
  onTheClockIndicator: '[class*="onTheClock" i], [class*="on-the-clock" i], [class*="onDeck" i]',
};

export const SELECTOR_STATUS = {
  verified: false,
  lastUpdated: null,
  notes: 'Placeholders only — awaiting live DOM inspection during a real or mock ESPN draft. See docs/espn-dom-notes.md.',
};

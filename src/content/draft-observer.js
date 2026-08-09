import { SELECTORS } from './selectors.js';

function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Assembles a pick's player name from the two separate name spans. ESPN emits
// them with no whitespace between, so reading the parent's textContent would
// produce "PukaNacua" — the join has to be explicit.
function readPick(cell) {
  const id = cell.querySelector(SELECTORS.roundPick)?.textContent?.trim() || '';
  const first = cell.querySelector(SELECTORS.playerFirstName)?.textContent?.trim() || '';
  const last = cell.querySelector(SELECTORS.playerLastName)?.textContent?.trim() || '';
  const name = `${first} ${last}`.trim();
  if (!name) return null;
  return {
    id: id || name, // roundPick ("3.7") is unique per draft; fall back to name
    name,
    team: cell.querySelector(SELECTORS.playerProTeam)?.textContent?.trim() || '',
    position: cell.querySelector(SELECTORS.positionPill)?.textContent?.trim() || '',
  };
}

// Watches the ESPN draft board for completed picks.
//
// onPicksDetected(picks[]) is called with only the picks not previously seen,
// batched per scan — including a full batch on the very first scan, which is
// how picks made before the extension loaded get caught up.
//
// Returns { active, reason, observer, stop }. `active: false` is never fatal:
// the caller keeps the overlay running in manual mode.
export function initObserver({ onPicksDetected }) {
  const seen = new Set();
  let sawAnyCell = false;

  const collect = () => {
    const cells = document.querySelectorAll(SELECTORS.completedPickCell);
    if (cells.length === 0) return;
    sawAnyCell = true;

    const fresh = [];
    cells.forEach((cell) => {
      const pick = readPick(cell);
      if (!pick || seen.has(pick.id)) return;
      seen.add(pick.id);
      fresh.push(pick);
    });
    if (fresh.length > 0) onPicksDetected(fresh);
  };

  const scan = debounce(collect, 250);

  // Observing document.body rather than the grid container keeps this working
  // when React re-mounts the board (e.g. on tab switches) and when the board
  // renders after the extension has already loaded. Picks are marked drafted
  // by a class change on an existing cell, so attributes must be watched too.
  const observer = new MutationObserver(scan);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
  });

  collect(); // immediate first pass for picks already on the board

  return {
    active: true,
    get foundBoard() {
      return sawAnyCell;
    },
    observer,
    stop() {
      observer.disconnect();
    },
  };
}

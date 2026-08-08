import { SELECTORS } from './selectors.js';

function waitForElement(selector, { timeout = 15000, interval = 300 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start >= timeout) return resolve(null);
      setTimeout(check, interval);
    };
    check();
  });
}

function debounce(fn, wait) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Builds a reasonably stable key for a pick element so we don't re-report
// the same pick on every mutation. Uses DOM position + a hash of its text,
// since ESPN's pick items likely don't expose a stable id/key attribute.
function pickKey(el, idx) {
  const text = (el.textContent || '').trim().slice(0, 120);
  return `${idx}::${text}`;
}

// Starts observing the ESPN draft room for new picks.
// onPickDetected(rawName: string, rawMeta: string) is called once per newly
// seen pick item, in DOM order, including any picks already present on load
// (handles the case where the pick list is virtualized/partially rendered).
//
// Resolves to { active: true, observer } on success, or
// { active: false, reason } if the expected containers never appear —
// callers must treat this as non-fatal and keep the rest of the extension
// (manual toggling) fully functional.
export async function initObserver({ onPickDetected }) {
  const root = await waitForElement(SELECTORS.draftRoomMarker, { timeout: 15000 });
  if (!root) {
    return { active: false, reason: 'draft-room-marker-not-found' };
  }

  const container = await waitForElement(SELECTORS.pickHistoryContainer, { timeout: 15000 });
  if (!container) {
    return { active: false, reason: 'pick-history-container-not-found' };
  }

  const seenPickKeys = new Set();

  const scan = debounce(() => {
    const items = container.querySelectorAll(SELECTORS.pickHistoryItem);
    items.forEach((el, idx) => {
      const key = pickKey(el, idx);
      if (seenPickKeys.has(key)) return;
      seenPickKeys.add(key);

      const nameEl = el.querySelector(SELECTORS.playerNameInPick);
      const metaEl = el.querySelector(SELECTORS.playerTeamPosInPick);
      const rawName = nameEl?.textContent?.trim();
      if (!rawName) return; // likely an empty/placeholder slot, not a real pick

      onPickDetected(rawName, metaEl?.textContent?.trim() ?? '');
    });
  }, 150);

  const observer = new MutationObserver(scan);
  observer.observe(container, { childList: true, subtree: true, characterData: true });

  // Catch picks already rendered before the observer attached.
  scan();

  return { active: true, observer };
}

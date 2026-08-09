import { getDraftState, onChange } from '../shared/storage.js';
import { STORAGE_KEYS, DEFAULT_OVERLAY_SETTINGS, EMPTY_DRAFT_STATE, EMPTY_TIER_LIST, SCHEMA_VERSION } from '../shared/constants.js';
import { loadBundledRankings, isEmptyTierList } from '../shared/default-rankings.js';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const defaults = {};
  if (!existing[STORAGE_KEYS.DRAFT_STATE]) defaults[STORAGE_KEYS.DRAFT_STATE] = EMPTY_DRAFT_STATE;
  if (!existing[STORAGE_KEYS.OVERLAY_SETTINGS]) defaults[STORAGE_KEYS.OVERLAY_SETTINGS] = DEFAULT_OVERLAY_SETTINGS;
  if (!existing[STORAGE_KEYS.EXTENSION_META]) {
    defaults[STORAGE_KEYS.EXTENSION_META] = { schemaVersion: SCHEMA_VERSION, installedAt: new Date().toISOString() };
  }

  // Ship usable rankings out of the box. Only seeds when nothing is stored yet,
  // so a list the user imported themselves is never overwritten on update.
  if (isEmptyTierList(existing[STORAGE_KEYS.TIER_LIST])) {
    try {
      defaults[STORAGE_KEYS.TIER_LIST] = await loadBundledRankings();
    } catch (err) {
      console.error('[ESPN Draft Buddy] could not seed bundled rankings:', err);
      defaults[STORAGE_KEYS.TIER_LIST] = EMPTY_TIER_LIST;
    }
  }

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
});

async function updateBadge() {
  const draftState = await getDraftState();
  const draftedCount = Object.keys(draftState.draftedPlayerIds || {}).length;
  chrome.action.setBadgeText({ text: draftedCount > 0 ? String(draftedCount) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3564e6' });
}

onChange([STORAGE_KEYS.DRAFT_STATE], updateBadge);
updateBadge();

// The overlay runs in a content script, which cannot call openOptionsPage
// itself — it sends this message instead.
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'openOptionsPage') {
    chrome.runtime.openOptionsPage();
  }
});

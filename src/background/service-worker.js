import { getDraftState, onChange } from '../shared/storage.js';
import { STORAGE_KEYS, DEFAULT_OVERLAY_SETTINGS, EMPTY_DRAFT_STATE, EMPTY_TIER_LIST, SCHEMA_VERSION } from '../shared/constants.js';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(Object.values(STORAGE_KEYS));
  const defaults = {};
  if (!existing[STORAGE_KEYS.TIER_LIST]) defaults[STORAGE_KEYS.TIER_LIST] = EMPTY_TIER_LIST;
  if (!existing[STORAGE_KEYS.DRAFT_STATE]) defaults[STORAGE_KEYS.DRAFT_STATE] = EMPTY_DRAFT_STATE;
  if (!existing[STORAGE_KEYS.OVERLAY_SETTINGS]) defaults[STORAGE_KEYS.OVERLAY_SETTINGS] = DEFAULT_OVERLAY_SETTINGS;
  if (!existing[STORAGE_KEYS.EXTENSION_META]) {
    defaults[STORAGE_KEYS.EXTENSION_META] = { schemaVersion: SCHEMA_VERSION, installedAt: new Date().toISOString() };
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

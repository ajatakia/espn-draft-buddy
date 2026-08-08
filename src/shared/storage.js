import {
  STORAGE_KEYS,
  DEFAULT_OVERLAY_SETTINGS,
  EMPTY_DRAFT_STATE,
  EMPTY_TIER_LIST,
} from './constants.js';

function get(key, fallback) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? fallback);
    });
  });
}

function set(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export function getTierList() {
  return get(STORAGE_KEYS.TIER_LIST, EMPTY_TIER_LIST);
}

export function setTierList(tierList) {
  return set(STORAGE_KEYS.TIER_LIST, tierList);
}

export function getDraftState() {
  return get(STORAGE_KEYS.DRAFT_STATE, EMPTY_DRAFT_STATE);
}

export function setDraftState(draftState) {
  return set(STORAGE_KEYS.DRAFT_STATE, draftState);
}

// Clears drafted picks / unmatched picks / name overrides for a new draft,
// without touching the imported tier list.
export function resetDraftState(draftId) {
  const fresh = {
    ...EMPTY_DRAFT_STATE,
    draftId: draftId ?? null,
    startedAt: new Date().toISOString(),
    draftedPlayerIds: {},
    unmatchedPicks: [],
    nameOverrides: {},
  };
  return set(STORAGE_KEYS.DRAFT_STATE, fresh);
}

export function getOverlaySettings() {
  return get(STORAGE_KEYS.OVERLAY_SETTINGS, DEFAULT_OVERLAY_SETTINGS);
}

export async function updateOverlaySettings(partial) {
  const current = await getOverlaySettings();
  const next = { ...current, ...partial };
  await set(STORAGE_KEYS.OVERLAY_SETTINGS, next);
  return next;
}

export async function updateDraftState(mutator) {
  const current = await getDraftState();
  const next = mutator(current);
  await set(STORAGE_KEYS.DRAFT_STATE, next);
  return next;
}

// Subscribes to changes on the given storage keys (array of STORAGE_KEYS values).
// Callback receives (changes) as provided by chrome.storage.onChanged, filtered
// to only the keys of interest. Returns an unsubscribe function.
export function onChange(keys, callback) {
  const keySet = new Set(keys);
  const listener = (changes, areaName) => {
    if (areaName !== 'local') return;
    const relevant = Object.keys(changes).filter((k) => keySet.has(k));
    if (relevant.length === 0) return;
    callback(changes, relevant);
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

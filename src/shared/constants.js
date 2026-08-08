// Storage key names used across all extension contexts.
export const STORAGE_KEYS = {
  TIER_LIST: 'tierList',
  DRAFT_STATE: 'draftState',
  OVERLAY_SETTINGS: 'overlaySettings',
  EXTENSION_META: 'extensionMeta',
};

export const SCHEMA_VERSION = 1;

export const DEFAULT_OVERLAY_SETTINGS = {
  visible: true,
  position: null, // null = use default top-right placement on first render
  collapsedTiers: [],
};

export const EMPTY_DRAFT_STATE = {
  draftId: null,
  startedAt: null,
  draftedPlayerIds: {},
  unmatchedPicks: [],
  nameOverrides: {},
};

export const EMPTY_TIER_LIST = {
  version: SCHEMA_VERSION,
  importedAt: null,
  source: null,
  tiers: [],
};

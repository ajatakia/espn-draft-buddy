import { parseCsv } from './csv-parser.js';
import { buildTierList } from './matching.js';

// Rankings shipped with the extension so it is useful the moment it is
// installed, with no manual import step.
export const BUNDLED_RANKINGS_PATH = 'data/fantasylife-consensus.csv';

// Reads and parses the bundled CSV. Extension pages and the service worker can
// fetch their own packaged files directly — this does not need to be listed in
// web_accessible_resources (that is only for access from web pages).
export async function loadBundledRankings() {
  const url = chrome.runtime.getURL(BUNDLED_RANKINGS_PATH);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`could not read bundled rankings (${response.status})`);

  const { tiers, errors } = parseCsv(await response.text());
  if (tiers.length === 0) {
    throw new Error(`bundled rankings failed to parse: ${errors.join('; ') || 'no rows'}`);
  }
  return buildTierList(tiers, { source: 'bundled' });
}

export function isEmptyTierList(tierList) {
  return !tierList?.tiers?.length || tierList.tiers.every((t) => !t.players?.length);
}

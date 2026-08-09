import { getTierList, setTierList } from '../shared/storage.js';
import { parseCsv } from '../shared/csv-parser.js';
import { validateTierListJson, jsonToRawTiers, SAMPLE_JSON } from '../shared/tier-list-schema.js';
import { buildTierList } from '../shared/matching.js';
import { loadBundledRankings } from '../shared/default-rankings.js';

const jsonPanel = document.getElementById('json-panel');
const csvPanel = document.getElementById('csv-panel');
const jsonInput = document.getElementById('json-input');
const csvInput = document.getElementById('csv-input');
const fileInput = document.getElementById('file-input');
const importBtn = document.getElementById('import-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');
const loadBundledBtn = document.getElementById('load-bundled-btn');
const clearBtn = document.getElementById('clear-btn');
const errorsEl = document.getElementById('errors');
const successEl = document.getElementById('success-msg');
const currentSummaryEl = document.getElementById('current-summary');

let activeFormat = 'json';

document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeFormat = btn.dataset.format;
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    jsonPanel.classList.toggle('hidden', activeFormat !== 'json');
    csvPanel.classList.toggle('hidden', activeFormat !== 'csv');
  });
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const text = await file.text();
  if (file.name.endsWith('.csv') || activeFormat === 'csv') {
    csvInput.value = text;
    activeFormat = 'csv';
    document.querySelector('[data-format="csv"]').click();
  } else {
    jsonInput.value = text;
    activeFormat = 'json';
    document.querySelector('[data-format="json"]').click();
  }
});

loadSampleBtn.addEventListener('click', () => {
  document.querySelector('[data-format="json"]').click();
  jsonInput.value = JSON.stringify(SAMPLE_JSON, null, 2);
});

function showErrors(errors) {
  errorsEl.innerHTML = errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('');
  errorsEl.classList.toggle('hidden', errors.length === 0);
  successEl.classList.add('hidden');
}

function showSuccess(msg) {
  successEl.textContent = msg;
  successEl.classList.remove('hidden');
  errorsEl.classList.add('hidden');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

importBtn.addEventListener('click', async () => {
  try {
    let rawTiers;
    let source;

    if (activeFormat === 'json') {
      const text = jsonInput.value.trim();
      if (!text) return showErrors(['Paste or upload JSON first.']);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return showErrors([`Invalid JSON: ${e.message}`]);
      }
      const { valid, errors } = validateTierListJson(parsed);
      if (!valid) return showErrors(errors);
      rawTiers = jsonToRawTiers(parsed);
      source = 'json';
    } else {
      const text = csvInput.value.trim();
      if (!text) return showErrors(['Paste or upload CSV first.']);
      const { tiers, errors } = parseCsv(text);
      if (tiers.length === 0) return showErrors(errors.length ? errors : ['No valid rows found.']);
      rawTiers = tiers;
      source = 'csv';
      if (errors.length > 0) showErrors(errors); // non-fatal warnings, still import valid rows
    }

    const tierList = buildTierList(rawTiers, { source });
    await setTierList(tierList);
    const playerCount = tierList.tiers.reduce((sum, t) => sum + t.players.length, 0);
    showSuccess(`Imported ${playerCount} players across ${tierList.tiers.length} tiers.`);
    await renderSummary();
  } catch (e) {
    showErrors([`Import failed: ${e.message}`]);
  }
});

loadBundledBtn.addEventListener('click', async () => {
  try {
    const tierList = await loadBundledRankings();
    await setTierList(tierList);
    const playerCount = tierList.tiers.reduce((sum, t) => sum + t.players.length, 0);
    showSuccess(`Loaded bundled rankings: ${playerCount} players across ${tierList.tiers.length} tiers.`);
    await renderSummary();
  } catch (e) {
    showErrors([`Could not load bundled rankings: ${e.message}`]);
  }
});

clearBtn.addEventListener('click', async () => {
  if (!window.confirm('Clear the imported tier list? This cannot be undone.')) return;
  await setTierList({ version: 1, importedAt: null, source: null, tiers: [] });
  await renderSummary();
  showSuccess('Rankings cleared.');
});

async function renderSummary() {
  const tierList = await getTierList();
  const playerCount = tierList.tiers.reduce((sum, t) => sum + t.players.length, 0);
  if (playerCount === 0) {
    currentSummaryEl.textContent = 'No rankings imported yet.';
  } else {
    const when = tierList.importedAt ? new Date(tierList.importedAt).toLocaleString() : 'unknown time';
    const origin = tierList.source === 'bundled' ? 'bundled list, loaded' : `imported from ${tierList.source}`;
    currentSummaryEl.textContent = `${playerCount} players across ${tierList.tiers.length} tiers — ${origin} ${when}.`;
  }
}

renderSummary();

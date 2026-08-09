// End-to-end check: loads the unpacked extension into Chromium, imports the
// bundled rankings through the real options page, opens a draft room, and
// verifies the overlay injects, auto-checks picks, toggles, and resets.
//
// Guards the two failure modes that are invisible to linting and only show up
// in a real browser:
//   1. content_scripts cannot use "type": "module" — a static import in a
//      declared content script dies with "Cannot use import statement outside
//      a module" and the overlay silently never appears.
//   2. chrome.runtime.openOptionsPage() is not available to content scripts.
//
// Usage:
//   node test/e2e.mjs /path/to/saved-espn-draft-page.html
//
// The fixture is a draft room saved from your browser (Cmd/Ctrl+S, "Web page,
// HTML only"). It is deliberately NOT committed — a saved draft page contains
// your league and team names.
//
// Requires playwright available to node (npm i -g playwright).

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { pathToFileURL, fileURLToPath } from 'url';

// Resolve playwright whether it's installed locally or globally (ESM imports
// ignore NODE_PATH, so a global install isn't found by bare specifier alone).
async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {
    const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
    const entry = path.join(root, 'playwright', 'index.mjs');
    if (!fs.existsSync(entry)) {
      console.error('playwright not found. Install it with:  npm i -g playwright');
      process.exit(2);
    }
    return (await import(pathToFileURL(entry).href)).chromium;
  }
}
const chromium = await loadChromium();

const EXT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = process.argv[2];
const DRAFT_URL = 'https://fantasy.espn.com/football/draft?leagueId=12345';

if (!FIXTURE || !fs.existsSync(FIXTURE)) {
  console.error('usage: node test/e2e.mjs <saved-espn-draft-page.html>');
  process.exit(2);
}

const html = fs.readFileSync(FIXTURE, 'utf8');
const csvText = fs.readFileSync(path.join(EXT, 'data/fantasylife-consensus.csv'), 'utf8');

const results = [];
const check = (label, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
};

const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'edb-')), {
  headless: true,
  channel: 'chromium',
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});

const errors = [];
ctx.on('weberror', (e) => errors.push(e.error().message));

// http(s) only: a catch-all would also intercept the extension's own
// chrome-extension:// resource loads and break its pages.
await ctx.route('http*://**/*', (route) =>
  route.request().url().startsWith('https://fantasy.espn.com/football/draft')
    ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html })
    : route.abort());

const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 10000 }));
const extId = sw.url().match(/^chrome-extension:\/\/([a-z]+)\//)[1];

// 1. import rankings through the options page
const options = await ctx.newPage();
options.on('pageerror', (e) => errors.push(`options: ${e.message}`));
await options.goto(`chrome-extension://${extId}/src/options/options.html`);
await options.click('[data-format="csv"]');
await options.fill('#csv-input', csvText);
await options.click('#import-btn');
await options.waitForTimeout(1200);
const importMsg = (await options.textContent('#success-msg'))?.trim();
check('options page imports CSV', /players across \d+ tiers/.test(importMsg || ''), importMsg);
await options.close();

// 2. overlay injects on the draft page and auto-detects picks
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(`draft: ${e.message}`));
await page.goto(DRAFT_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
await page.waitForTimeout(3500);

const readOverlay = () => page.evaluate(() => {
  const h = document.getElementById('espn-draft-buddy-host');
  if (!h?.shadowRoot) return null;
  const panel = h.shadowRoot.querySelector('.edb-panel');
  const launcher = h.shadowRoot.querySelector('.edb-launcher');
  return {
    panelHidden: panel?.classList.contains('edb-hidden') ?? null,
    launcherHidden: launcher?.classList.contains('edb-hidden') ?? null,
    drafted: h.shadowRoot.querySelectorAll('.edb-player.edb-drafted').length,
    rows: h.shadowRoot.querySelectorAll('.edb-player').length,
    status: h.shadowRoot.querySelector('.edb-status-pill')?.textContent?.trim(),
  };
});

let ov = await readOverlay();
check('overlay injects on draft page', ov !== null, ov ? `${ov.rows} rows` : 'host not found');
check('auto-detect marks picks drafted', (ov?.drafted ?? 0) > 0, `${ov?.drafted} drafted`);
check('status pill shows active', /active/i.test(ov?.status || ''), ov?.status);

// 3. popup Show/Hide toggle drives the overlay (popup.js closes itself, so
//    each press needs a fresh page)
const pressToggle = async () => {
  const popup = await ctx.newPage();
  popup.on('pageerror', (e) => errors.push(`popup: ${e.message}`));
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popup.click('#toggle-overlay-btn');
  await page.waitForTimeout(700);
  await popup.close().catch(() => {});
};

await pressToggle();
ov = await readOverlay();
check('Show/Hide hides the panel', ov?.panelHidden === true && ov?.launcherHidden === false);

await pressToggle();
ov = await readOverlay();
check('Show/Hide shows it again', ov?.panelHidden === false && ov?.launcherHidden === true);

// 4. manual click-to-toggle
const before = ov.drafted;
await page.evaluate(() => {
  const sr = document.getElementById('espn-draft-buddy-host').shadowRoot;
  [...sr.querySelectorAll('.edb-player')].find((r) => !r.classList.contains('edb-drafted'))?.click();
});
await page.waitForTimeout(600);
ov = await readOverlay();
check('manual click marks a player drafted', ov.drafted === before + 1, `${before} -> ${ov.drafted}`);

// 5. reset clears drafted state but keeps the imported rankings
const resetPopup = await ctx.newPage();
resetPopup.on('dialog', (d) => d.accept());
await resetPopup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
await resetPopup.click('#reset-draft-btn');
await page.waitForTimeout(900);
await resetPopup.close().catch(() => {});
ov = await readOverlay();
check('reset clears drafted, keeps tier list', ov.drafted === 0 && ov.rows > 0, `drafted=${ov.drafted} rows=${ov.rows}`);

console.log('\npage errors:', errors.length ? [...new Set(errors)].join('; ') : '(none)');
const passed = results.filter(Boolean).length;
console.log(`${passed}/${results.length} checks passed`);
await ctx.close();
process.exit(passed === results.length ? 0 : 1);

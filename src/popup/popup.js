import { getOverlaySettings, updateOverlaySettings, resetDraftState, getTierList } from '../shared/storage.js';

const statusLine = document.getElementById('status-line');
const toggleBtn = document.getElementById('toggle-overlay-btn');
const resetBtn = document.getElementById('reset-draft-btn');
const optionsBtn = document.getElementById('open-options-btn');

function isDraftRoomUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === 'fantasy.espn.com' && u.pathname.toLowerCase().includes('draft');
  } catch {
    return false;
  }
}

async function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

async function renderStatus() {
  const tab = await getActiveTab();
  const onDraftPage = isDraftRoomUrl(tab?.url);
  const tierList = await getTierList();
  const playerCount = tierList.tiers.reduce((sum, t) => sum + t.players.length, 0);

  const parts = [];
  parts.push(onDraftPage ? 'On an ESPN draft page.' : 'Not on an ESPN draft page.');
  parts.push(playerCount > 0 ? `${playerCount} players ranked.` : 'No rankings imported yet.');
  statusLine.textContent = parts.join(' ');
}

toggleBtn.addEventListener('click', async () => {
  const settings = await getOverlaySettings();
  await updateOverlaySettings({ visible: !settings.visible });
  window.close();
});

resetBtn.addEventListener('click', async () => {
  if (!window.confirm('Reset the draft? This clears all drafted-player checks (your imported rankings are kept).')) return;
  const tab = await getActiveTab();
  let draftId = null;
  try {
    draftId = tab?.url ? new URL(tab.url).searchParams.get('leagueId') : null;
  } catch {
    // ignore
  }
  await resetDraftState(draftId);
  window.close();
});

optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

renderStatus();

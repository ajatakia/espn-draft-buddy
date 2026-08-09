import { OVERLAY_CSS } from './overlay-styles.js';
import {
  getTierList,
  getDraftState,
  getOverlaySettings,
  updateOverlaySettings,
  updateDraftState,
  resetDraftState,
  onChange,
} from '../shared/storage.js';

const DEFAULT_POSITION = () => ({ x: Math.max(20, window.innerWidth - 380), y: 80 });

export function initOverlay() {
  const host = document.createElement('div');
  host.id = 'espn-draft-buddy-host';
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = OVERLAY_CSS;
  shadow.appendChild(styleEl);

  const panel = document.createElement('div');
  panel.className = 'edb-panel';
  shadow.appendChild(panel);

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'edb-launcher edb-hidden';
  launcher.textContent = 'Draft Buddy';
  shadow.appendChild(launcher);
  launcher.addEventListener('click', () => updateOverlaySettings({ visible: true }));

  // The panel chrome is built once and never torn down. Only the player list
  // inside .edb-body is ever re-rendered, and even that is avoided for the
  // common case of a player being checked off — see syncFromState().
  panel.innerHTML = `
    <div class="edb-header" id="edb-drag-handle">
      <span class="edb-title">Draft Buddy</span>
      <span class="edb-status-pill" id="edb-status"></span>
      <button class="edb-icon-btn" id="edb-close-btn" title="Hide overlay">✕</button>
    </div>
    <div class="edb-search-wrap">
      <input class="edb-search" id="edb-search" type="text" placeholder="Search players…" />
    </div>
    <div class="edb-body" id="edb-body"></div>
    <div class="edb-footer">
      <button id="edb-reset-btn">Reset Draft</button>
      <button id="edb-options-btn">Import…</button>
    </div>`;

  const bodyEl = panel.querySelector('#edb-body');
  const statusEl = panel.querySelector('#edb-status');
  const searchInput = panel.querySelector('#edb-search');

  let state = {
    tierList: { tiers: [] },
    draftState: { draftedPlayerIds: {}, unmatchedPicks: [], nameOverrides: {} },
    overlaySettings: { visible: true, position: null, collapsedTiers: [] },
    searchQuery: '',
    autoDetectStatus: { active: false, reason: 'initializing' },
  };

  async function loadAll() {
    const [tierList, draftState, overlaySettings] = await Promise.all([
      getTierList(),
      getDraftState(),
      getOverlaySettings(),
    ]);
    state = { ...state, tierList, draftState, overlaySettings };
    syncFromState();
  }

  function allPlayersFlat() {
    return state.tierList.tiers.flatMap((t) => t.players);
  }

  function matchesSearch(player) {
    if (!state.searchQuery) return true;
    return player.normalizedName.includes(state.searchQuery.toLowerCase());
  }

  // Everything that changes which ROWS exist. Drafted state is deliberately
  // excluded: checking a player off must not rebuild the list, because that
  // would throw away the user's scroll position mid-draft.
  function bodySignature() {
    const tl = state.tierList;
    const total = tl.tiers.reduce((s, t) => s + t.players.length, 0);
    const unmatched = (state.draftState.unmatchedPicks || []).map((u) => u.normalizedText).join('|');
    return [tl.importedAt, tl.tiers.length, total, state.searchQuery, unmatched].join('§');
  }

  let lastBodySignature = null;

  function syncFromState() {
    renderChrome();
    const sig = bodySignature();
    if (sig !== lastBodySignature) {
      lastBodySignature = sig;
      renderBody();
    }
    applyDraftedState();
    applyCollapsedState();
  }

  function renderChrome() {
    const pos = state.overlaySettings.position || DEFAULT_POSITION();
    panel.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    panel.classList.toggle('edb-hidden', state.overlaySettings.visible === false);
    launcher.classList.toggle('edb-hidden', state.overlaySettings.visible !== false);
    launcher.style.transform = `translate(${Math.max(20, window.innerWidth - 140)}px, ${pos.y}px)`;

    const { active, reason } = state.autoDetectStatus;
    statusEl.classList.toggle('edb-active', active);
    statusEl.classList.toggle('edb-inactive', !active);
    statusEl.textContent = active
      ? 'Auto-detect: active'
      : `Manual mode${reason ? ` (${reason})` : ''}`;

    const total = state.tierList.tiers.reduce((s, t) => s + t.players.length, 0);
    searchInput.placeholder = `Search players… (${total} total)`;
  }

  // Rows are rendered without drafted styling; applyDraftedState() is the
  // single place that decides what looks drafted.
  function renderBody() {
    const scrollTop = bodyEl.scrollTop;

    if (state.tierList.tiers.length === 0) {
      bodyEl.innerHTML = '<div class="edb-empty">No rankings imported yet. Open the extension options to import a tiered list.</div>';
      return;
    }

    const tiersHtml = state.tierList.tiers.map((tier) => {
      const visiblePlayers = tier.players.filter(matchesSearch);
      if (state.searchQuery && visiblePlayers.length === 0) return '';
      const rows = visiblePlayers.map((p) => `
        <li class="edb-player" data-player-id="${escapeAttr(p.id)}">
          <span class="edb-player-check"></span>
          <span class="edb-player-name">${escapeHtml(p.name)}</span>
          <span class="edb-player-meta">${escapeHtml(p.position)} ${escapeHtml(p.team)}</span>
        </li>`).join('');
      return `
        <div class="edb-tier" data-tier-number="${tier.tierNumber}">
          <div class="edb-tier-header" data-tier-toggle="${tier.tierNumber}">
            <span class="edb-caret">▾</span>
            <span>${escapeHtml(tier.label || `Tier ${tier.tierNumber}`)}</span>
            <span class="edb-tier-count"></span>
          </div>
          <ul class="edb-players">${rows}</ul>
        </div>`;
    }).join('');

    const unmatched = state.draftState.unmatchedPicks || [];
    const playerOptions = allPlayersFlat()
      .map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.position)} ${escapeHtml(p.team)})</option>`)
      .join('');
    const unmatchedHtml = unmatched.length === 0 ? '' : `
      <div class="edb-tier" data-tier-number="unmatched">
        <div class="edb-tier-header" data-tier-toggle="unmatched">
          <span class="edb-caret">▾</span>
          <span>Unmatched Picks</span>
          <span class="edb-tier-count">${unmatched.length}</span>
        </div>
        <div class="edb-players">
          ${unmatched.map((u) => `
            <div class="edb-unmatched-item">
              <div class="edb-unmatched-raw">${escapeHtml(u.rawText)}</div>
              <select class="edb-unmatched-select" data-unmatched-key="${escapeAttr(u.normalizedText)}">
                <option value="">Link to player…</option>
                ${playerOptions}
              </select>
            </div>`).join('')}
        </div>
      </div>`;

    bodyEl.innerHTML = tiersHtml + unmatchedHtml;
    bodyEl.scrollTop = scrollTop;
  }

  // In-place update: toggles classes on existing rows so the list is never
  // rebuilt and the scroll position survives.
  function applyDraftedState() {
    const drafted = state.draftState.draftedPlayerIds || {};

    bodyEl.querySelectorAll('.edb-player').forEach((el) => {
      const isDrafted = Boolean(drafted[el.dataset.playerId]);
      el.classList.toggle('edb-drafted', isDrafted);
      const check = el.querySelector('.edb-player-check');
      if (check) check.textContent = isDrafted ? '✓' : '';
    });

    for (const tier of state.tierList.tiers) {
      const countEl = bodyEl.querySelector(`.edb-tier[data-tier-number="${tier.tierNumber}"] .edb-tier-count`);
      if (!countEl) continue;
      const n = tier.players.reduce((s, p) => s + (drafted[p.id] ? 1 : 0), 0);
      countEl.textContent = `${n}/${tier.players.length}`;
    }
  }

  function applyCollapsedState() {
    const collapsed = new Set(state.overlaySettings.collapsedTiers || []);
    bodyEl.querySelectorAll('.edb-tier').forEach((el) => {
      const key = el.dataset.tierNumber;
      const value = key === 'unmatched' ? 'unmatched' : Number(key);
      el.classList.toggle('edb-collapsed', collapsed.has(value));
    });
  }

  // ---- events -------------------------------------------------------------
  // Delegated from the panel, which is never replaced, so handlers are bound
  // exactly once no matter how often the body re-renders.

  panel.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.closest('#edb-close-btn')) {
      await updateOverlaySettings({ visible: false });
      return;
    }

    const tierHeader = target.closest('[data-tier-toggle]');
    if (tierHeader) {
      const key = tierHeader.dataset.tierToggle;
      const tierNumber = key === 'unmatched' ? 'unmatched' : Number(key);
      const current = new Set(state.overlaySettings.collapsedTiers || []);
      if (current.has(tierNumber)) current.delete(tierNumber);
      else current.add(tierNumber);
      await updateOverlaySettings({ collapsedTiers: [...current] });
      return;
    }

    const row = target.closest('.edb-player');
    if (row) {
      const playerId = row.dataset.playerId;
      await updateDraftState((ds) => {
        const drafted = { ...ds.draftedPlayerIds };
        if (drafted[playerId]) delete drafted[playerId];
        else drafted[playerId] = { draftedAt: new Date().toISOString(), method: 'manual' };
        return { ...ds, draftedPlayerIds: drafted };
      });
      return;
    }

    if (target.closest('#edb-reset-btn')) {
      if (!window.confirm('Reset the draft? This clears all drafted-player checks (imported rankings are kept).')) return;
      await resetDraftState();
      return;
    }

    // chrome.runtime.openOptionsPage() is not exposed to content scripts —
    // only an extension page or the background worker can call it.
    if (target.closest('#edb-options-btn')) {
      chrome.runtime.sendMessage({ type: 'openOptionsPage' });
    }
  });

  panel.addEventListener('change', async (event) => {
    const select = event.target.closest?.('.edb-unmatched-select');
    if (!select) return;
    const playerId = select.value;
    if (!playerId) return;

    // Keyed by the pick's normalized text rather than its list index, so a
    // concurrently-detected pick can't shift the target out from under us.
    const key = select.dataset.unmatchedKey;
    await updateDraftState((ds) => {
      const pick = ds.unmatchedPicks.find((u) => u.normalizedText === key);
      if (!pick) return ds;
      return {
        ...ds,
        draftedPlayerIds: {
          ...ds.draftedPlayerIds,
          [playerId]: { draftedAt: new Date().toISOString(), method: 'resolved' },
        },
        nameOverrides: { ...ds.nameOverrides, [key]: playerId },
        unmatchedPicks: ds.unmatchedPicks.filter((u) => u.normalizedText !== key),
      };
    });
  });

  // The input element is part of the permanent chrome, so typing no longer
  // destroys and recreates it — focus and caret position take care of themselves.
  searchInput.addEventListener('input', (event) => {
    state.searchQuery = event.target.value;
    syncFromState();
  });

  wireDrag();

  function wireDrag() {
    const handle = panel.querySelector('#edb-drag-handle');
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let originX = 0;
    let originY = 0;

    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const pos = state.overlaySettings.position || DEFAULT_POSITION();
      originX = pos.x;
      originY = pos.y;
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panel.style.transform = `translate(${originX + (e.clientX - startX)}px, ${originY + (e.clientY - startY)}px)`;
    });

    window.addEventListener('mouseup', async (e) => {
      if (!dragging) return;
      dragging = false;
      await updateOverlaySettings({
        position: { x: originX + (e.clientX - startX), y: originY + (e.clientY - startY) },
      });
    });
  }

  onChange(['tierList', 'draftState', 'overlaySettings'], loadAll);
  loadAll();

  return {
    setAutoDetectStatus(active, reason) {
      state.autoDetectStatus = { active, reason };
      renderChrome();
    },
  };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

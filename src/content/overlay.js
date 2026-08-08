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
  launcher.addEventListener('click', async () => {
    await updateOverlaySettings({ visible: true });
  });

  let state = {
    tierList: { tiers: [] },
    draftState: { draftedPlayerIds: {}, unmatchedPicks: {}, nameOverrides: {} },
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
    render();
  }

  function matchesSearch(player) {
    if (!state.searchQuery) return true;
    return player.normalizedName.includes(state.searchQuery.toLowerCase());
  }

  function render() {
    const pos = state.overlaySettings.position || DEFAULT_POSITION();
    panel.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    panel.classList.toggle('edb-hidden', state.overlaySettings.visible === false);
    launcher.classList.toggle('edb-hidden', state.overlaySettings.visible !== false);
    launcher.style.transform = `translate(${Math.max(20, window.innerWidth - 140)}px, ${pos.y}px)`;

    const draftedIds = state.draftState.draftedPlayerIds || {};
    const collapsed = new Set(state.overlaySettings.collapsedTiers || []);

    const totalPlayers = state.tierList.tiers.reduce((s, t) => s + t.players.length, 0);

    const tiersHtml = state.tierList.tiers.length === 0
      ? '<div class="edb-empty">No rankings imported yet. Open the extension options to import a tiered list.</div>'
      : state.tierList.tiers.map((tier) => {
        const visiblePlayers = tier.players.filter(matchesSearch);
        if (state.searchQuery && visiblePlayers.length === 0) return '';
        const isCollapsed = collapsed.has(tier.tierNumber);
        const draftedCount = tier.players.filter((p) => draftedIds[p.id]).length;
        const rows = visiblePlayers.map((p) => {
          const isDrafted = Boolean(draftedIds[p.id]);
          return `
            <li class="edb-player ${isDrafted ? 'edb-drafted' : ''}" data-player-id="${escapeAttr(p.id)}">
              <span class="edb-player-check">${isDrafted ? '✓' : ''}</span>
              <span class="edb-player-name">${escapeHtml(p.name)}</span>
              <span class="edb-player-meta">${escapeHtml(p.position)} ${escapeHtml(p.team)}</span>
            </li>`;
        }).join('');
        return `
          <div class="edb-tier ${isCollapsed ? 'edb-collapsed' : ''}" data-tier-number="${tier.tierNumber}">
            <div class="edb-tier-header" data-tier-toggle="${tier.tierNumber}">
              <span class="edb-caret">▾</span>
              <span>${escapeHtml(tier.label || `Tier ${tier.tierNumber}`)}</span>
              <span class="edb-tier-count">${draftedCount}/${tier.players.length}</span>
            </div>
            <ul class="edb-players">${rows}</ul>
          </div>`;
      }).join('');

    const unmatched = state.draftState.unmatchedPicks || [];
    const unmatchedHtml = unmatched.length === 0 ? '' : `
      <div class="edb-tier" data-tier-number="unmatched">
        <div class="edb-tier-header" data-tier-toggle="unmatched">
          <span class="edb-caret">▾</span>
          <span>Unmatched Picks</span>
          <span class="edb-tier-count">${unmatched.length}</span>
        </div>
        <div class="edb-players">
          ${unmatched.map((u, i) => `
            <div class="edb-unmatched-item">
              <div class="edb-unmatched-raw">${escapeHtml(u.rawText)}</div>
              <select class="edb-unmatched-select" data-unmatched-index="${i}">
                <option value="">Link to player…</option>
                ${allPlayersFlat().map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.name)} (${escapeHtml(p.position)} ${escapeHtml(p.team)})</option>`).join('')}
              </select>
            </div>`).join('')}
        </div>
      </div>`;

    const statusActive = state.autoDetectStatus.active;

    panel.innerHTML = `
      <div class="edb-header" id="edb-drag-handle">
        <span class="edb-title">Draft Buddy</span>
        <span class="edb-status-pill ${statusActive ? 'edb-active' : 'edb-inactive'}">
          ${statusActive ? 'Auto-detect: active' : `Manual mode${state.autoDetectStatus.reason ? ` (${state.autoDetectStatus.reason})` : ''}`}
        </span>
        <button class="edb-icon-btn" id="edb-close-btn" title="Hide overlay">✕</button>
      </div>
      <div class="edb-search-wrap">
        <input class="edb-search" id="edb-search" type="text" placeholder="Search players… (${totalPlayers} total)" value="${escapeAttr(state.searchQuery)}" />
      </div>
      <div class="edb-body">${tiersHtml}${unmatchedHtml}</div>
      <div class="edb-footer">
        <button id="edb-reset-btn">Reset Draft</button>
        <button id="edb-options-btn">Import…</button>
      </div>
    `;

    wireDomEvents();
  }

  function allPlayersFlat() {
    return state.tierList.tiers.flatMap((t) => t.players);
  }

  function wireDomEvents() {
    panel.querySelector('#edb-close-btn')?.addEventListener('click', async () => {
      await updateOverlaySettings({ visible: false });
    });

    panel.querySelector('#edb-search')?.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      render();
      // restore focus + caret since innerHTML re-render drops it
      const input = panel.querySelector('#edb-search');
      input.focus();
      input.selectionStart = input.selectionEnd = input.value.length;
    });

    panel.querySelectorAll('[data-tier-toggle]').forEach((el) => {
      el.addEventListener('click', async () => {
        const key = el.dataset.tierToggle;
        const tierNumber = key === 'unmatched' ? 'unmatched' : Number(key);
        const current = new Set(state.overlaySettings.collapsedTiers || []);
        if (current.has(tierNumber)) current.delete(tierNumber);
        else current.add(tierNumber);
        await updateOverlaySettings({ collapsedTiers: [...current] });
      });
    });

    panel.querySelectorAll('.edb-player').forEach((el) => {
      el.addEventListener('click', async () => {
        const playerId = el.dataset.playerId;
        await updateDraftState((ds) => {
          const drafted = { ...ds.draftedPlayerIds };
          if (drafted[playerId]) {
            delete drafted[playerId];
          } else {
            drafted[playerId] = { draftedAt: new Date().toISOString(), method: 'manual' };
          }
          return { ...ds, draftedPlayerIds: drafted };
        });
      });
    });

    panel.querySelectorAll('.edb-unmatched-select').forEach((select) => {
      select.addEventListener('change', async (e) => {
        const playerId = e.target.value;
        if (!playerId) return;
        const idx = Number(select.dataset.unmatchedIndex);
        await updateDraftState((ds) => {
          const pick = ds.unmatchedPicks[idx];
          if (!pick) return ds;
          const drafted = { ...ds.draftedPlayerIds, [playerId]: { draftedAt: new Date().toISOString(), method: 'resolved' } };
          const overrides = { ...ds.nameOverrides, [pick.normalizedText]: playerId };
          const unmatchedPicks = ds.unmatchedPicks.filter((_, i) => i !== idx);
          return { ...ds, draftedPlayerIds: drafted, nameOverrides: overrides, unmatchedPicks };
        });
      });
    });

    panel.querySelector('#edb-reset-btn')?.addEventListener('click', async () => {
      if (!window.confirm('Reset the draft? This clears all drafted-player checks (imported rankings are kept).')) return;
      await resetDraftState();
    });

    panel.querySelector('#edb-options-btn')?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    wireDrag();
  }

  function wireDrag() {
    const handle = panel.querySelector('#edb-drag-handle');
    if (!handle) return;
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
      const x = originX + (e.clientX - startX);
      const y = originY + (e.clientY - startY);
      panel.style.transform = `translate(${x}px, ${y}px)`;
    });

    window.addEventListener('mouseup', async (e) => {
      if (!dragging) return;
      dragging = false;
      const x = originX + (e.clientX - startX);
      const y = originY + (e.clientY - startY);
      await updateOverlaySettings({ position: { x, y } });
    });
  }

  onChange(['tierList', 'draftState', 'overlaySettings'], async () => {
    await loadAll();
  });

  loadAll();

  return {
    setAutoDetectStatus(active, reason) {
      state.autoDetectStatus = { active, reason };
      render();
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

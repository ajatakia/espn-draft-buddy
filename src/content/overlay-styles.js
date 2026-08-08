export const OVERLAY_CSS = `
:host { all: initial; }
* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

.edb-panel {
  position: fixed;
  top: 80px;
  left: 0;
  width: 340px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: #171a21ee;
  color: #e6e8eb;
  border: 1px solid #2a2e37;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.5);
  z-index: 2147483647;
  backdrop-filter: blur(4px);
  font-size: 13px;
}
.edb-panel.edb-hidden { display: none; }

.edb-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: move;
  border-bottom: 1px solid #2a2e37;
  user-select: none;
}
.edb-title { font-weight: 600; font-size: 13px; flex: 1; }
.edb-status-pill {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #2a2e37;
  color: #9aa1ab;
  white-space: nowrap;
}
.edb-status-pill.edb-active { background: #1c3a2a; color: #7fd99a; }
.edb-status-pill.edb-inactive { background: #3a2a1c; color: #e0b070; }
.edb-icon-btn {
  background: transparent;
  border: none;
  color: #9aa1ab;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  line-height: 1;
}
.edb-icon-btn:hover { color: #e6e8eb; }

.edb-search-wrap { padding: 8px 12px; border-bottom: 1px solid #2a2e37; }
.edb-search {
  width: 100%;
  background: #0f1115;
  border: 1px solid #2a2e37;
  border-radius: 6px;
  color: #e6e8eb;
  padding: 6px 8px;
  font-size: 12px;
}

.edb-body { overflow-y: auto; flex: 1; }

.edb-tier { border-bottom: 1px solid #21242c; }
.edb-tier-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  background: #1b1e26;
  font-weight: 600;
  font-size: 12px;
  color: #c7cbd3;
}
.edb-tier-header .edb-caret { transition: transform 0.15s; }
.edb-tier.edb-collapsed .edb-caret { transform: rotate(-90deg); }
.edb-tier.edb-collapsed .edb-players { display: none; }
.edb-tier-count { margin-left: auto; color: #6b7280; font-weight: 400; }

.edb-players { list-style: none; margin: 0; padding: 0; }
.edb-player {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  border-top: 1px solid #21242c;
}
.edb-player:hover { background: #1e222b; }
.edb-player-check {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #3a4050;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.edb-player.edb-drafted .edb-player-check { background: #3564e6; border-color: #3564e6; color: #fff; }
.edb-player-name { flex: 1; }
.edb-player.edb-drafted .edb-player-name { text-decoration: line-through; color: #6b7280; }
.edb-player-meta { color: #6b7280; font-size: 11px; white-space: nowrap; }

.edb-empty { padding: 16px 12px; color: #6b7280; font-size: 12px; text-align: center; }

.edb-unmatched-item {
  padding: 6px 12px;
  border-top: 1px solid #21242c;
  font-size: 12px;
}
.edb-unmatched-raw { color: #e0b070; }
.edb-unmatched-select {
  width: 100%;
  margin-top: 4px;
  background: #0f1115;
  border: 1px solid #2a2e37;
  border-radius: 4px;
  color: #e6e8eb;
  font-size: 11px;
  padding: 3px 4px;
}

.edb-footer {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #2a2e37;
}
.edb-footer button {
  flex: 1;
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 11px;
  cursor: pointer;
  background: #2a2e37;
  color: #e6e8eb;
}
.edb-footer button.edb-danger { background: #4a1f24; color: #ff9fa8; }

.edb-launcher {
  position: fixed;
  top: 80px;
  left: 0;
  z-index: 2147483647;
  background: #3564e6;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0,0,0,0.4);
}
.edb-launcher.edb-hidden { display: none; }
`;

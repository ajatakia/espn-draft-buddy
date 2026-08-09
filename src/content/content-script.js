import { initOverlay } from './overlay.js';
import { initObserver } from './draft-observer.js';
import { getTierList, getDraftState, setDraftState } from '../shared/storage.js';
import { buildPlayerIndex, matchPlayer } from '../shared/matching.js';

function isDraftRoomPage() {
  return location.hostname === 'fantasy.espn.com' && location.pathname.toLowerCase().includes('draft');
}

// Storage updates are read-modify-write, so overlapping batches would clobber
// each other (the first board scan alone can report 100+ picks at once).
// Chaining every batch through one promise keeps them strictly sequential.
let queue = Promise.resolve();
function enqueue(task) {
  queue = queue.then(task).catch((err) => console.error('[ESPN Draft Buddy]', err));
  return queue;
}

async function applyPicks(picks) {
  const tierList = await getTierList();
  const playerIndex = buildPlayerIndex(tierList);
  const draftState = await getDraftState();

  const drafted = { ...draftState.draftedPlayerIds };
  const unmatched = [...draftState.unmatchedPicks];
  let changed = false;

  for (const pick of picks) {
    const result = matchPlayer(pick.name, playerIndex, draftState.nameOverrides, {
      position: pick.position,
      team: pick.team,
    });

    if (result.matched) {
      if (drafted[result.playerId]) continue;
      drafted[result.playerId] = { draftedAt: new Date().toISOString(), method: 'auto' };
      changed = true;
      continue;
    }

    if (unmatched.some((u) => u.normalizedText === result.normalized)) continue;
    unmatched.push({
      rawText: pick.name,
      normalizedText: result.normalized,
      detectedAt: new Date().toISOString(),
      team: pick.team,
      position: pick.position,
    });
    changed = true;
  }

  if (!changed) return;
  await setDraftState({ ...draftState, draftedPlayerIds: drafted, unmatchedPicks: unmatched });
}

export async function start() {
  if (!isDraftRoomPage()) return;

  const overlay = initOverlay();
  let reportedBoard = false;

  const watcher = initObserver({
    onPicksDetected: (picks) => {
      enqueue(() => applyPicks(picks));
      if (!reportedBoard) {
        reportedBoard = true;
        overlay.setAutoDetectStatus(true, null);
      }
    },
  });

  overlay.setAutoDetectStatus(true, watcher.foundBoard ? null : 'waiting for draft board');
}

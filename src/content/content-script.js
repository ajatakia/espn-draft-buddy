import { initOverlay } from './overlay.js';
import { initObserver } from './draft-observer.js';
import { getTierList, getDraftState, updateDraftState } from '../shared/storage.js';
import { buildPlayerIndex, matchPlayer } from '../shared/matching.js';

function isDraftRoomPage() {
  return location.hostname === 'fantasy.espn.com' && location.pathname.toLowerCase().includes('draft');
}

async function handlePick(rawName, rawMeta) {
  const tierList = await getTierList();
  const playerIndex = buildPlayerIndex(tierList);
  const draftState = await getDraftState();

  const result = matchPlayer(rawName, playerIndex, draftState.nameOverrides);

  await updateDraftState((ds) => {
    if (result.matched) {
      if (ds.draftedPlayerIds[result.playerId]) return ds; // already recorded
      return {
        ...ds,
        draftedPlayerIds: {
          ...ds.draftedPlayerIds,
          [result.playerId]: { draftedAt: new Date().toISOString(), method: 'auto' },
        },
      };
    }

    // Avoid piling up duplicate unmatched entries for the same raw text.
    const already = ds.unmatchedPicks.some((u) => u.normalizedText === result.normalized);
    if (already) return ds;
    return {
      ...ds,
      unmatchedPicks: [
        ...ds.unmatchedPicks,
        { rawText: rawName, normalizedText: result.normalized, detectedAt: new Date().toISOString() },
      ],
    };
  });
}

async function main() {
  if (!isDraftRoomPage()) return;

  const overlay = initOverlay();

  const observerResult = await initObserver({ onPickDetected: handlePick });
  overlay.setAutoDetectStatus(observerResult.active, observerResult.reason);
}

main();

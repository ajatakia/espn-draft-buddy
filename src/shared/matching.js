// Normalizes a player name for exact-match comparison between imported
// rankings and names scraped off the ESPN draft board.
export function normalizePlayerName(raw) {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/\./g, '') // "A.J." -> "aj"
    .replace(/[’']/g, '') // strip apostrophes
    .replace(/,/g, '') // strip stray commas (e.g. "Gibbs, Jahmyr" fragments)
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '') // strip trailing suffix
    .replace(/[^a-z0-9\s-]/g, '') // drop remaining punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Attaches id/normalizedName to raw tier data from csv-parser or JSON import,
// producing the storage-ready tierList.tiers shape.
export function buildTierList(rawTiers, { source = 'unknown' } = {}) {
  const tiers = rawTiers.map((tier) => ({
    tierNumber: tier.tierNumber,
    label: tier.label ?? `Tier ${tier.tierNumber}`,
    players: tier.players.map((p) => {
      const normalizedName = normalizePlayerName(p.name);
      return {
        id: `t${tier.tierNumber}-r${p.rank}-${slugify(normalizedName)}`,
        name: p.name,
        normalizedName,
        position: p.position ?? '',
        team: p.team ?? '',
        rank: p.rank,
        notes: p.notes ?? '',
      };
    }),
  }));

  return {
    version: 1,
    importedAt: new Date().toISOString(),
    source,
    tiers,
  };
}

// Builds a normalizedName -> player lookup map for O(1) exact matching.
// Note (v1 known limitation): if two players share a normalized name, the
// later one in tier/rank order wins the index slot.
export function buildPlayerIndex(tierList) {
  const map = new Map();
  for (const tier of tierList.tiers) {
    for (const player of tier.players) {
      map.set(player.normalizedName, player);
    }
  }
  return map;
}

// Attempts to match a raw scraped name against the player index.
// Checks manual nameOverrides first (learned from prior "resolve unmatched"
// actions), then falls back to exact normalized-name match.
export function matchPlayer(rawName, playerIndex, nameOverrides = {}) {
  const normalized = normalizePlayerName(rawName);

  if (nameOverrides[normalized]) {
    return { matched: true, playerId: nameOverrides[normalized], via: 'override', normalized };
  }

  const player = playerIndex.get(normalized);
  if (player) {
    return { matched: true, playerId: player.id, via: 'exact', normalized };
  }

  return { matched: false, rawName, normalized };
}

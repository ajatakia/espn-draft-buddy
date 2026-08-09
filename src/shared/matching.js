// Normalizes a player name for comparison between imported rankings and names
// scraped off the ESPN draft board.
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

// Ranking sources and ESPN disagree on a handful of team abbreviations.
const TEAM_ALIASES = {
  JAC: 'JAX', JAG: 'JAX',
  WAS: 'WSH', WSH: 'WSH',
  LA: 'LAR', STL: 'LAR', SL: 'LAR',
  SD: 'LAC',
  OAK: 'LV', LVR: 'LV',
  TAM: 'TB', GNB: 'GB', KAN: 'KC', NOR: 'NO', SFO: 'SF', NWE: 'NE',
  ARZ: 'ARI', BLT: 'BAL', HST: 'HOU', CLV: 'CLE',
};

function normalizeTeam(team) {
  const upper = (team || '').toUpperCase().trim();
  return TEAM_ALIASES[upper] || upper;
}

function lastNameOf(normalizedName) {
  const parts = normalizedName.split(' ').filter(Boolean);
  return parts.length ? parts[parts.length - 1] : '';
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

// Builds lookup tables for matching. Beyond the exact-name map there are two
// fallback indexes keyed on last name, which is what survives the first-name
// differences between sources ("Kenny" vs "Kenneth" Gainwell, "C. McCaffrey").
export function buildPlayerIndex(tierList) {
  const byName = new Map();
  const byLastPosTeam = new Map();
  const byLastPos = new Map();

  const push = (map, key, player) => {
    const existing = map.get(key);
    if (existing) existing.push(player);
    else map.set(key, [player]);
  };

  for (const tier of tierList.tiers) {
    for (const player of tier.players) {
      byName.set(player.normalizedName, player);
      const last = lastNameOf(player.normalizedName);
      const pos = (player.position || '').toUpperCase();
      if (!last || !pos) continue;
      push(byLastPos, `${last}|${pos}`, player);
      push(byLastPosTeam, `${last}|${pos}|${normalizeTeam(player.team)}`, player);
    }
  }

  return {
    byName,
    byLastPos,
    byLastPosTeam,
    size: byName.size,
    has: (normalizedName) => byName.has(normalizedName),
  };
}

// Resolves a scraped pick to a ranked player.
//
// Tried in order, stopping at the first hit:
//   1. a manual override the user set by resolving an earlier unmatched pick
//   2. exact normalized name
//   3. last name + position + team
//   4. last name + position
//
// Steps 3 and 4 only accept a *unique* candidate. Marking the wrong player
// drafted is worse than leaving one unmatched, so an ambiguous last name
// (e.g. "brown|WR" matching both A.J. Brown and Amon-Ra St. Brown) falls
// through to the unmatched list rather than guessing.
export function matchPlayer(rawName, playerIndex, nameOverrides = {}, meta = {}) {
  const normalized = normalizePlayerName(rawName);

  if (nameOverrides[normalized]) {
    return { matched: true, playerId: nameOverrides[normalized], via: 'override', normalized };
  }

  const exact = playerIndex.byName.get(normalized);
  if (exact) {
    return { matched: true, playerId: exact.id, via: 'exact', normalized, matchedName: exact.name };
  }

  const last = lastNameOf(normalized);
  const position = (meta.position || '').toUpperCase();

  if (last && position) {
    const withTeam = playerIndex.byLastPosTeam.get(`${last}|${position}|${normalizeTeam(meta.team)}`);
    if (withTeam?.length === 1) {
      return {
        matched: true,
        playerId: withTeam[0].id,
        via: 'last-name+position+team',
        normalized,
        matchedName: withTeam[0].name,
      };
    }

    const withoutTeam = playerIndex.byLastPos.get(`${last}|${position}`);
    if (withoutTeam?.length === 1) {
      return {
        matched: true,
        playerId: withoutTeam[0].id,
        via: 'last-name+position',
        normalized,
        matchedName: withoutTeam[0].name,
      };
    }
  }

  return { matched: false, rawName, normalized };
}

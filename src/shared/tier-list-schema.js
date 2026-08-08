// Validates a user-provided JSON import before it's normalized into the
// storage-ready tierList shape (see matching.buildTierList).
// Accepts either the full storage shape ({version, tiers: [...]}) or a bare
// { tiers: [...] } object; only `tiers` is required from the user.
export function validateTierListJson(obj) {
  const errors = [];

  if (obj === null || typeof obj !== 'object') {
    return { valid: false, errors: ['Top-level JSON must be an object.'] };
  }

  if (!Array.isArray(obj.tiers)) {
    return { valid: false, errors: ['JSON must have a "tiers" array.'] };
  }

  if (obj.tiers.length === 0) {
    errors.push('"tiers" array is empty.');
  }

  obj.tiers.forEach((tier, tIdx) => {
    if (typeof tier !== 'object' || tier === null) {
      errors.push(`tiers[${tIdx}] must be an object.`);
      return;
    }
    if (typeof tier.tierNumber !== 'number') {
      errors.push(`tiers[${tIdx}].tierNumber must be a number.`);
    }
    if (!Array.isArray(tier.players)) {
      errors.push(`tiers[${tIdx}].players must be an array.`);
      return;
    }
    tier.players.forEach((p, pIdx) => {
      if (typeof p !== 'object' || p === null || typeof p.name !== 'string' || !p.name.trim()) {
        errors.push(`tiers[${tIdx}].players[${pIdx}] must have a non-empty "name" string.`);
      }
      if (p && p.rank !== undefined && typeof p.rank !== 'number') {
        errors.push(`tiers[${tIdx}].players[${pIdx}].rank must be a number if present.`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

// Converts validated raw JSON into the RawTier[] shape expected by
// matching.buildTierList (auto-assigns rank within a tier if missing).
export function jsonToRawTiers(obj) {
  return obj.tiers.map((tier) => ({
    tierNumber: tier.tierNumber,
    label: tier.label,
    players: tier.players.map((p, i) => ({
      name: p.name.trim(),
      position: p.position ?? '',
      team: p.team ?? '',
      rank: typeof p.rank === 'number' ? p.rank : i + 1,
      notes: p.notes ?? '',
    })),
  }));
}

export const SAMPLE_JSON = {
  tiers: [
    {
      tierNumber: 1,
      label: 'Tier 1 - Elite',
      players: [
        { name: 'Christian McCaffrey', position: 'RB', team: 'SF', rank: 1 },
        { name: 'Tyreek Hill', position: 'WR', team: 'MIA', rank: 2 },
      ],
    },
    {
      tierNumber: 2,
      label: 'Tier 2',
      players: [
        { name: 'Justin Jefferson', position: 'WR', team: 'MIN', rank: 3 },
      ],
    },
  ],
};

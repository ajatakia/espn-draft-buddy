// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// inside quoted fields, and commas/newlines inside quoted fields.
// Returns an array of rows, each row an array of string cells.
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }

    if (char === '\r') {
      i += 1;
      continue;
    }

    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // flush trailing field/row (file may not end with a newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

// Expected header: tier,rank,name,position,team,notes
// Returns { tiers: RawTier[], errors: string[] }
// RawTier = { tierNumber, players: [{ name, position, team, rank, notes }] }
export function parseCsv(text) {
  const errors = [];
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    return { tiers: [], errors: ['CSV is empty.'] };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const required = ['tier', 'rank', 'name', 'position', 'team'];
  const missing = required.filter((col) => !header.includes(col));
  if (missing.length > 0) {
    return { tiers: [], errors: [`CSV header is missing required column(s): ${missing.join(', ')}. Expected: tier,rank,name,position,team,notes`] };
  }

  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  const tierMap = new Map();

  for (let r = 1; r < rows.length; r += 1) {
    const cols = rows[r];
    if (cols.every((c) => c.trim() === '')) continue;

    const tierRaw = cols[idx.tier]?.trim();
    const rankRaw = cols[idx.rank]?.trim();
    const name = cols[idx.name]?.trim();
    const position = cols[idx.position]?.trim() ?? '';
    const team = cols[idx.team]?.trim() ?? '';
    const notes = idx.notes !== undefined ? (cols[idx.notes]?.trim() ?? '') : '';

    const tierNumber = Number(tierRaw);
    const rank = Number(rankRaw);

    if (!name) {
      errors.push(`Row ${r + 1}: missing player name, skipped.`);
      continue;
    }
    if (Number.isNaN(tierNumber)) {
      errors.push(`Row ${r + 1}: invalid tier "${tierRaw}" for "${name}", skipped.`);
      continue;
    }

    if (!tierMap.has(tierNumber)) {
      tierMap.set(tierNumber, []);
    }
    tierMap.get(tierNumber).push({
      name,
      position,
      team,
      rank: Number.isNaN(rank) ? tierMap.get(tierNumber).length + 1 : rank,
      notes,
    });
  }

  const tiers = [...tierMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tierNumber, players]) => ({
      tierNumber,
      players: players.sort((a, b) => a.rank - b.rank),
    }));

  return { tiers, errors };
}

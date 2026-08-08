# JSON import format

Paste an object with a `tiers` array. Only `tiers` is required at the top level.

```json
{
  "tiers": [
    {
      "tierNumber": 1,
      "label": "Tier 1 - Elite",
      "players": [
        { "name": "Christian McCaffrey", "position": "RB", "team": "SF", "rank": 1 },
        { "name": "Tyreek Hill", "position": "WR", "team": "MIA", "rank": 2 }
      ]
    },
    {
      "tierNumber": 2,
      "label": "Tier 2",
      "players": [
        { "name": "Justin Jefferson", "position": "WR", "team": "MIN", "rank": 3 }
      ]
    }
  ]
}
```

Field notes:
- `tierNumber` (number, required per tier) — determines tier grouping and display order.
- `label` (string, optional) — defaults to `"Tier {tierNumber}"` if omitted.
- `players[].name` (string, required) — matched against names scraped from the ESPN draft board after normalization (lowercased, punctuation/suffixes stripped).
- `players[].position`, `players[].team`, `players[].notes` — optional, display-only.
- `players[].rank` (number, optional) — sort order within the tier; defaults to array order if omitted.

## Known limitation

Duplicate normalized player names across the list are not disambiguated by position/team in v1 (see `csv-format.md` for details — same limitation applies to both import formats).

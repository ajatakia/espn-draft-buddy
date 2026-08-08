# CSV import format

Header row required. Columns:

```
tier,rank,name,position,team,notes
```

- `tier` — integer tier number. Rows are grouped into tiers by this value.
- `rank` — integer rank within the tier (used for sort order). Optional; if omitted or non-numeric, players are ranked in file order within their tier.
- `name` — player full name. Required. This is what gets matched against names scraped from the ESPN draft board (after normalization: lowercased, punctuation/suffixes stripped).
- `position` — e.g. `RB`, `WR`, `QB`, `TE`, `D/ST`, `K`. Optional, display-only.
- `team` — e.g. `SF`, `MIA`. Optional, display-only.
- `notes` — optional free text. Wrap in double quotes if it contains a comma, e.g. `"handles change of pace"`.

## Example

```csv
tier,rank,name,position,team,notes
1,1,Christian McCaffrey,RB,SF,
1,2,Tyreek Hill,WR,MIA,
2,3,Justin Jefferson,WR,MIN,
2,4,Jahmyr Gibbs,RB,DET,"handles, per depth chart"
```

Always enter `name` as **"First Last"** (matching how ESPN displays player names on the draft board) — not "Last, First". A comma inside `name` will be stripped during matching and can cause the word order to no longer line up with what gets scraped. Commas are fine inside `notes` as long as the field is quoted, as shown above.

## Known limitation

If two players in your list share the same name after normalization, the extension does not disambiguate by position/team in v1 — the later entry (by tier/rank order) wins name-matching. This is rare in practice but worth knowing if you're tracking IDP/defense-heavy leagues with generic names.

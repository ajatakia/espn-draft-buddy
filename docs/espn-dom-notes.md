# ESPN draft room DOM notes

`src/content/selectors.js` currently contains **unverified placeholder** selectors — this extension was built without live access to ESPN's fantasy football draft room, so auto-detection of drafted players may not work out of the box.

To fix this, run a real or mock draft on `fantasy.espn.com` and fill in the sections below, then update `src/content/selectors.js` to match.

## How to inspect

1. Open a live ESPN fantasy football draft room (or a mock draft, if the DOM is close enough — note any differences).
2. Open Chrome DevTools (F12) → Elements panel.
3. Right-click the container that lists picks as they happen ("Recent Picks" / pick history) → Inspect.
4. Right-click that element in the Elements panel → Copy → Copy outerHTML.
5. Paste the snippet into the relevant section below, trimmed to the interesting structure (class names, nesting).

## 1. Draft room marker

_Paste an HTML snippet of an element/attribute that reliably indicates you're on the draft room page (e.g. a top-level container with a distinctive class or `data-testid`)._

```html
<!-- paste here -->
```

## 2. Pick history container

_The scrollable list that holds all picks as they're made._

```html
<!-- paste here -->
```

## 3. Individual pick item

_One single pick's markup — ideally copy two or three so we can see what's stable vs. what varies (e.g. team logo, pick number)._

```html
<!-- paste here -->
```

## 4. Player name element (within a pick item)

```html
<!-- paste here -->
```

## 5. Player team/position element (within a pick item)

```html
<!-- paste here -->
```

## 6. "On the clock" indicator (optional, for future features)

```html
<!-- paste here -->
```

## Notes / gotchas observed

- _Is the pick list virtualized (only recent picks kept in the DOM)? If so, the observer's initial scan may miss early picks made before the extension attached — note here if that's the case, since it changes how the initial scan should behave._
- _Any differences between the live draft room and the mock draft lobby, if you tested both._

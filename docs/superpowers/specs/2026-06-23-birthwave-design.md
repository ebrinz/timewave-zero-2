# Birthwave — Design

**Date:** 2026-06-23
**Status:** Approved (design), pending implementation plan

## Summary

Add a **Birthwave** mode: a second timewave re-anchored to the user's birthday,
shown alongside (and in front of) the canonical 2012 wave. A birthday is entered
through an Amiga-styled stepper date picker, cached in `localStorage`, and used to
draw a personal novelty curve. A new upper-right HUD reports how deep into a local
novelty "well" the current centre moment sits.

## The core insight

The viewport measures everything in `t` = "days before the 2012 zero point"
(`ZERO_DATE = 2012-12-21 12:00 UTC`, `src/chart/time.ts`). A birth-anchored wave is
the **same `novelty()` function shifted horizontally** by a constant — no second
coordinate system, no change to `ZERO_DATE`, `dateToT`, URL-sync, viewport, grid, or
the oracle (all correctly built on the 2012 anchor).

```
birthZero    = birthday + 24576 days          // 24576 = 64 × 384
birthOffset  = (birthZero − ZERO_DATE) / DAY_MS   // days; constant
birthWave(t) = novelty(t + birthOffset)
```

### Why 24576 days

The user's offset "67 years and 104.25 days" with 365.25-day years is exactly
`67 × 365.25 + 104.25 = 24576 = 64 × 384` — the timewave's own deep number
(64 King Wen hexagrams × the 384-value Sheliak data set). The birth-anchored
eschaton lands exactly one fractal cycle (64 × 384 days) after birth.

`novelty(t) = waveValue(|t|)` already mirrors about its own zero, so the birth wave
is symmetric about `birthZero` — the personal singularity has matching pre/post
structure, consistent with how the 2012 wave is drawn.

## Display model & states

- **Birthwave OFF** → unchanged app: the 2012 wave only.
- **Birthwave ON** → the **birth wave is primary** (foreground styling); the **2012
  wave becomes a toggleable background ghost** (faint, dashed).
- Turning Birthwave ON with no saved birthday opens the date picker first; Birthwave
  only engages once a valid birthday is set.

Draw order in `WaveLayer`: background ghost first (2012, only if its toggle is on),
primary wave on top.

**Colors:** birth wave = warm **amber** edge + amber fill (`--wb-orange` family);
2012 ghost = faint blue, dashed. When Birthwave is OFF the 2012 wave keeps its
current white-edge / blue-fill styling.

## Markers (`MarkersLayer`)

When Birthwave is ON, add:
- **`BIRTH ZERO · <date>`** at `birthday + 24576d` (amber, solid).
- **`BORN · <date>`** at the birthday (amber, faint).

The existing red `ZERO POINT · 21 DEC 2012` marker stays; it dims when the 2012
background ghost is hidden.

## Novelty index — local-well proximity (`NoveltyIndexLayer`)

A new canvas overlay layer drawn top-right of the chart. Per frame:

1. Sample the **primary** wave's novelty across the visible window (~256 samples).
   Primary = birth wave when Birthwave ON, else the 2012 wave.
2. **Detrend**: subtract a linear least-squares fit over the window. This removes the
   dominant macro ramp — without it, an intra-week window's min→max is mostly "where
   you are on the ramp" and buries the local structure. Because the fit is recomputed
   per window, it auto-adapts to zoom; the fractal self-similarity means the in-window
   "trend" is just the next octave up, so subtracting it exposes the octave on screen.
3. On the residual, find **troughs** (local minima = novelty wells) and the one
   nearest the centre.
4. Report **proximity** of the centre to that well, e.g.
   `NOVELTY WELL ●●●●○ 0.78`:
   - `1.0` = centre sits exactly in a well (peak local novelty / ingression).
   - `0` = centre on a crest.

### Proximity formula (to validate in tests)

Within the local segment bracketing the centre — between the nearest residual crest
before and after — let `rt` be the bracketed trough residual, `rc` the higher of the
two bracketing crests, `r0` the centre residual:

```
proximity = clamp01( (rc − r0) / (rc − rt) )
```

= 1 at the trough, 0 at the crest. If the window is monotonic after detrending (no
interior trough), report `0` / "no well in view". Lower novelty value = more novel,
so a deeper residual (smaller `r0`) → higher proximity, as intended.

## Persistence (`src/state/birthwave.ts`)

A small localStorage-backed store:

```ts
type BirthwaveState = {
  birthday: string | null;   // "YYYY-MM-DD"
  birthwave: boolean;        // mode on/off
  background: boolean;       // show 2012 ghost when birthwave on
};
```

Loaded on mount, saved on change. **Not** encoded in the URL (URL-sync stays purely
viewport state). URL-sharing of birthwave is a possible later extension, out of scope
here.

## UI — ChartDock "BIRTHWAVE" section (`src/components/ChartDock.tsx`)

- `BIRTHWAVE [ON/OFF]` toggle (`wb-btn--on` when active).
- `BIRTHDATE…` button showing the current birthday → opens the picker.
- `2012 WAVE [ON/OFF]` background toggle (enabled only when Birthwave is ON).

## Date picker (`src/components/BirthdatePicker.tsx`)

Amiga stepper modal:

```
┌─ BIRTHDATE ────────────┐
│   DD     MM     YYYY    │
│ ◀ 23 ▶ ◀ 06 ▶ ◀ 1987 ▶ │
│     [ SET ]  [ CANCEL ] │
└────────────────────────┘
```

- Three stepper fields with `◀ / ▶` gadgets, Workbench-styled (`wb-out` / `wb-btn`).
- Day clamps to the selected month's length, leap-year aware (e.g. stepping month to
  Feb with day 31 clamps to 28/29).
- Year bounded to a sane range (e.g. 1900..current year).
- `SET` saves the birthday, enables Birthwave, closes. `CANCEL` discards.

## Files

**New**
- `src/state/birthwave.ts` — localStorage store + React hook/context.
- `src/components/BirthdatePicker.tsx` — stepper modal.
- `src/chart/noveltyIndex.ts` — detrend + trough/proximity math (unit-tested).
- `src/chart/layers/NoveltyIndexLayer.ts` — top-right HUD layer.

**Changed**
- `src/chart/layers/WaveLayer.ts` — draw two waves (primary + optional ghost), color split.
- `src/chart/layers/MarkersLayer.ts` — `BIRTH ZERO` + `BORN` markers when Birthwave on.
- `src/components/ChartDock.tsx` — Birthwave controls.
- `src/components/ChartShell.tsx` / `ChartProvider.tsx` — wire birthwave state into the
  layer stack and dock.
- Layer-stack registration where `WaveLayer` / `MarkersLayer` are composed (add
  `NoveltyIndexLayer`).

## Testing

- **`noveltyIndex.ts`** (unit, Vitest): detrend removes a linear ramp; troughs located
  on a known wave; proximity = 1 at a trough, 0 at a crest, `0`/"no well" on a
  monotonic window; `clamp01` bounds.
- **`birthwave.ts`** (unit): load/save roundtrip; missing/corrupt localStorage falls
  back to defaults; `birthOffset` / `birthZero` derivation (born 1987-06-23 → birthZero
  = 1987-06-23 + 24576 days).
- **BirthdatePicker** (component): day clamps on month/year change; leap-year Feb 29;
  SET emits the chosen date.
- **Manual / Playwright**: toggle Birthwave → amber wave + birth markers appear; 2012
  ghost toggles; birthday persists across reload; novelty index updates on pan/zoom.

## Out of scope

- URL-sharing of birthwave state.
- Multiple saved birthdays / profiles.
- Changing the oracle (hexagram) reading to follow the birth anchor.

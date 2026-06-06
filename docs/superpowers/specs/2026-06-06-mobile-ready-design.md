# Mobile-Ready Timewave Zero 2 — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorming)

## Goal

Make the interactive timewave chart usable on phones — touch zoom/pan/read, a
stacked layout, and proper tap targets — without disturbing the existing desktop
Amiga-Workbench experience. No new chart features, no theme redesign.

## Current state (why the work is needed)

- **No `viewport` meta** in `src/app/layout.tsx`, so phones render at desktop
  width and the browser owns pinch-zoom.
- **Zoom is wheel/trackpad only** (`ChartCanvas` non-passive `wheel` listener).
  No pinch-to-zoom.
- **Readout is hover-only** (`LiveReadout` + title bar render from `hover`).
  Touch has no hover, so there is no way to read novelty on a phone.
- **Layout is fixed side-by-side**: `ChartShell` body is `flex` (row) with
  `ChartDock` (`w-[150px]`) docked right — chart gets very narrow on phones.
- **Small tap targets**: dock buttons are `14px` text, `1px` padding (`.wb-btn`).

## Decisions (from brainstorming)

- **Dock on narrow screens:** stack **below** the chart (chart on top, dock as a
  wrapping horizontal strip). Everything stays visible — no hidden controls.
- **Touch input:** pinch-to-zoom **and** tap/drag-to-read **and** on-screen
  zoom buttons (all three).

## Design

### 1. Viewport meta (foundation)

Add Next 16's `viewport` export to `src/app/layout.tsx`:

```ts
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false,
};
```

`maximumScale: 1` / `userScalable: false` stops the *page* from pinch-zooming so
the *chart* owns the pinch gesture (canvas already sets `touchAction: 'none'`).

### 2. Responsive layout — stack dock below chart

- `ChartShell`: body becomes column on narrow, row on wide —
  `flex-col sm:flex-row`.
- `ChartDock`: `w-full sm:w-[150px]`; inner layout `flex-row flex-wrap` on narrow,
  `sm:flex-col` on wide. The three readouts (Span / Depth / Novelty) sit in a row;
  zoom presets wrap. The chart panel keeps `flex-1 min-h-0` so it takes the top.

### 3. Multi-touch in `ChartCanvas` (core work)

Replace the single-`drag` ref with a small active-pointer map keyed by
`pointerId`, so one finger vs. two is distinguishable. Behaviour:

- **One finger drag** → pan. Same math as today (`panBy`, span-scaled delta).
- **One finger tap** (down→up, movement under a small px threshold) → set a
  *persistent* `hover` readout at that x (`xToT` + `novelty`). `LiveReadout` and
  the title bar already render from `hover`; no change needed there.
- **Two fingers** → pinch-zoom anchored at the finger midpoint, reusing
  `zoomTo(view, xToT(midX), ratio)` — the same function the wheel path uses.
  `ratio = prevDistance / currentDistance` between move frames.

Desktop mouse / wheel / hover paths are left untouched. Mouse hover (a move with
no active pointer) still sets the transient readout as before.

### 4. On-screen zoom buttons (gesture-free fallback)

Add `+` / `−` buttons to `ChartDock` near `FULL WAVE`, calling
`zoomTo(view, center, 0.8)` / `zoomTo(view, center, 1.25)` where
`center = (tLeft + tRight) / 2`. Works with no gestures — accessibility +
belt-and-suspenders. (`zoomTo` already clamps to `LIMITS`.)

### 5. Tap targets

Dock buttons (`.wb-btn`) get more vertical padding on touch-sized screens (e.g.
`py-2 sm:py-px` via utility classes, or a touch-only rule) so presets / GOTO /
zoom clear the ~44px touch minimum. Desktop stays compact.

### 6. Menu-bar nav

Verify the top nav (Chart / Help / About / Share) does not overflow at ~360px;
tighten gaps only if it does. Verifying, not redesigning.

## Testing

- **Unit:** extract the pinch/tap pointer decision logic where practical and
  unit-test the ratio/tap-threshold math (Vitest).
- **Live:** Playwright at a phone viewport (375×667) — confirm pinch zoom, tap
  reads novelty, single-finger pan, the stacked layout, and the +/− buttons.
- Existing chart/viewport unit tests must still pass (logic untouched).

## Out of scope

- No new chart features or markers.
- No visual redesign of the Workbench theme.
- No landscape-specific layout beyond what the breakpoint yields.

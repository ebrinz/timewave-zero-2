# Mobile-Ready Timewave Zero 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the interactive timewave chart usable on phones — pinch-to-zoom, tap-to-read, a stacked dock layout, on-screen zoom buttons, and touch-sized tap targets — without changing the desktop experience.

**Architecture:** Extract pure pinch/tap geometry into a testable `src/chart/gestures.ts` module. Rework `ChartCanvas` to track multiple pointers (one finger = pan or tap, two fingers = pinch) on top of that module, reusing the existing `zoomTo`/`panBy`/`xToT` viewport math. Make the layout responsive in `ChartShell`/`ChartDock` (column on narrow, row on wide), add `+`/`−` zoom buttons, add a `viewport` meta export, and bump tap targets via a `pointer: coarse` CSS rule.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript, Tailwind v4, Pointer Events API, Canvas 2D. Tests: Vitest (+ Testing Library), Playwright for live verification.

---

## File Structure

- **Create** `src/chart/gestures.ts` — pure pinch/tap geometry helpers (`distance`, `midpoint`, `isTap`, `Pt`, `TAP_MOVE_PX`). No DOM, no React. Fully unit-testable.
- **Create** `src/chart/__tests__/gestures.test.ts` — unit tests for the above.
- **Modify** `src/components/ChartCanvas.tsx` — replace the single-`drag` ref with a multi-pointer gesture model that consumes `gestures.ts`.
- **Modify** `src/app/layout.tsx` — add Next 16 `viewport` export.
- **Modify** `src/components/ChartShell.tsx` — body stacks column on narrow, row on wide.
- **Modify** `src/components/ChartDock.tsx` — full-width wrapping strip on narrow; add `+`/`−` zoom buttons.
- **Modify** `src/app/globals.css` — `@media (pointer: coarse)` rule to enlarge `.wb-btn` tap targets.

Spec: `docs/superpowers/specs/2026-06-06-mobile-ready-design.md`.

---

## Task 1: Pure gesture geometry module

**Files:**
- Create: `src/chart/gestures.ts`
- Test: `src/chart/__tests__/gestures.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/chart/__tests__/gestures.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { distance, midpoint, isTap, TAP_MOVE_PX } from '@/chart/gestures';

describe('gestures', () => {
  it('distance is euclidean', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it('midpoint averages both axes', () => {
    expect(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })).toEqual({ x: 5, y: 10 });
  });

  it('isTap is true for travel at or under the threshold, false beyond', () => {
    expect(isTap(0)).toBe(true);
    expect(isTap(TAP_MOVE_PX)).toBe(true);
    expect(isTap(TAP_MOVE_PX + 0.01)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/chart/__tests__/gestures.test.ts`
Expected: FAIL — cannot resolve module `@/chart/gestures`.

- [ ] **Step 3: Write minimal implementation**

Create `src/chart/gestures.ts`:

```ts
/** A point in canvas pixel space (offset coordinates). */
export interface Pt { x: number; y: number; }

/** Euclidean distance between two pointers — drives the pinch zoom ratio. */
export const distance = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Midpoint of two pointers — the anchor a pinch zooms around. */
export const midpoint = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Max finger travel (px) a one-finger press may have and still count as a tap. */
export const TAP_MOVE_PX = 6;

/** True when a press moved little enough to read as a tap rather than a pan. */
export const isTap = (totalMove: number, threshold = TAP_MOVE_PX): boolean =>
  totalMove <= threshold;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/chart/__tests__/gestures.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/chart/gestures.ts src/chart/__tests__/gestures.test.ts
git commit -m "feat: pure pinch/tap gesture geometry helpers"
```

---

## Task 2: Viewport meta export

**Files:**
- Modify: `src/app/layout.tsx`

No unit test — this is framework metadata; it's covered by the Task 7 live check (page renders at device width, page-level pinch disabled).

- [ ] **Step 1: Add the import**

In `src/app/layout.tsx`, change the first import line:

```ts
import type { Metadata, Viewport } from 'next';
```

(It currently reads `import type { Metadata } from 'next';`.)

- [ ] **Step 2: Add the viewport export**

Immediately after the closing `};` of the existing `export const metadata: Metadata = { ... };` block, add:

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

- [ ] **Step 3: Verify it typechecks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: device-width viewport meta so the chart owns pinch"
```

---

## Task 3: Multi-touch ChartCanvas (pinch + tap-to-read + pan)

**Files:**
- Modify: `src/components/ChartCanvas.tsx`

The pure math is unit-tested in Task 1. The DOM/pointer wiring (canvas, `offsetX`, pointer capture, multi-touch) is not practical to unit-test in jsdom; it is verified live with Playwright in Task 7.

- [ ] **Step 1: Replace the imports**

Replace the top imports of `src/components/ChartCanvas.tsx` (currently lines 1–5) with:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { xToT, zoomTo, panBy, type Dims, type Viewport } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';
import { distance, midpoint, isTap, type Pt } from '@/chart/gestures';
```

- [ ] **Step 2: Replace the `drag` ref with a pointer/gesture model**

Delete this line (currently line 12):

```tsx
  const drag = useRef<{ x: number; view: typeof view } | null>(null);
```

Replace it with:

```tsx
  // Active pointers (mouse or touch), keyed by pointerId, for multi-touch.
  const pointers = useRef(new Map<number, Pt>());
  // The in-flight gesture. A one-finger 'pan' records the view + start point at
  // press time and the max travel since (a travel-free release reads as a tap).
  // A two-finger 'pinch' tracks the last finger distance to derive a per-frame
  // zoom ratio.
  const gesture = useRef<
    | { kind: 'pan'; startX: number; startY: number; view: Viewport; moved: number }
    | { kind: 'pinch'; lastDist: number }
    | null
  >(null);
```

- [ ] **Step 3: Replace the pointer handlers**

Replace the four handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, currently lines 76–91) with:

```tsx
  const ptOf = (e: React.PointerEvent): Pt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, ptOf(e));
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', lastDist: distance(a, b) };
    } else {
      const p = ptOf(e);
      gesture.current = { kind: 'pan', startX: p.x, startY: p.y, view: viewRef.current, moved: 0 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = ptOf(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    const g = gesture.current;

    if (g?.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = distance(a, b);
      if (dist > 0) {
        const mid = midpoint(a, b);
        const v = viewRef.current, w = dimsRef.current.w;
        setView(zoomTo(v, xToT(mid.x, v, w), g.lastDist / dist));
        g.lastDist = dist;
      }
      return;
    }

    if (g?.kind === 'pan') {
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.startX, p.y - g.startY));
      const span = g.view.tLeft - g.view.tRight;
      const dt = ((p.x - g.startX) / dimsRef.current.w) * span;
      setView(panBy(g.view, dt));
      return;
    }

    // No active gesture → mouse hover (touch never moves without a pointer down).
    if (pointers.current.size === 0) {
      const v = viewRef.current;
      const t = xToT(p.x, v, dimsRef.current.w);
      setHover({ t, x: p.x, y: p.y, novelty: novelty(t) });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const g = gesture.current;
    const p = ptOf(e);
    pointers.current.delete(e.pointerId);

    // A travel-free one-finger release is a tap → drop a persistent readout.
    if (g?.kind === 'pan' && isTap(g.moved)) {
      const v = viewRef.current;
      const t = xToT(p.x, v, dimsRef.current.w);
      setHover({ t, x: p.x, y: p.y, novelty: novelty(t) });
    }

    // Re-derive the gesture from whatever fingers remain down.
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', lastDist: distance(a, b) };
    } else if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      gesture.current = { kind: 'pan', startX: only.x, startY: only.y, view: viewRef.current, moved: 0 };
    } else {
      gesture.current = null;
    }
  };
```

- [ ] **Step 4: Update the canvas JSX event props**

Replace the `<canvas ... />` element's event props (the `onPointerDown`/`onPointerMove`/`onPointerUp`/`onPointerLeave` lines, currently 99–102) with:

```tsx
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => {
          // Only the mouse "leaves" without a release; touch is cleaned up on
          // up/cancel (with capture, leave doesn't fire mid-pinch).
          if (e.pointerType === 'mouse') {
            pointers.current.delete(e.pointerId);
            gesture.current = null;
            setHover(null);
          }
        }}
```

- [ ] **Step 5: Typecheck and run the chart unit tests**

Run: `npm run typecheck && npx vitest run src/chart`
Expected: no type errors; all `src/chart` tests pass (the viewport math is unchanged).

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: no errors (no unused imports — `Viewport`, `panBy`, gesture helpers are all used).

- [ ] **Step 7: Commit**

```bash
git add src/components/ChartCanvas.tsx
git commit -m "feat: pinch-to-zoom, tap-to-read, multi-touch pan on the chart"
```

---

## Task 4: Responsive stacked layout

**Files:**
- Modify: `src/components/ChartShell.tsx`
- Modify: `src/components/ChartDock.tsx`

Verified live in Task 7 (no unit test for Tailwind class layout).

- [ ] **Step 1: Stack the window body on narrow screens**

In `src/components/ChartShell.tsx`, change the `WorkbenchWindow` `bodyClassName` prop. It currently reads:

```tsx
        bodyClassName="flex min-h-0"
```

Change it to:

```tsx
        bodyClassName="flex flex-col sm:flex-row min-h-0"
```

- [ ] **Step 2: Make the dock a full-width wrapping strip on narrow screens**

In `src/components/ChartDock.tsx`, change the outer container. It currently reads:

```tsx
    <div className="wb-panel wb-in flex flex-col gap-2 p-2 w-[150px] text-[13px]">
```

Change it to:

```tsx
    <div className="wb-panel wb-in flex flex-row flex-wrap sm:flex-col gap-2 p-2 w-full sm:w-[150px] text-[13px]">
```

- [ ] **Step 3: Hide the divider on narrow screens**

Still in `src/components/ChartDock.tsx`, the horizontal rule looks wrong as a child of a flex row. It currently reads:

```tsx
      <hr className="border-t-2 border-black/40 my-0.5" />
```

Change it to:

```tsx
      <hr className="border-t-2 border-black/40 my-0.5 hidden sm:block w-full" />
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChartShell.tsx src/components/ChartDock.tsx
git commit -m "feat: stack the dock below the chart on narrow screens"
```

---

## Task 5: On-screen zoom buttons

**Files:**
- Modify: `src/components/ChartDock.tsx`

Verified live in Task 7.

- [ ] **Step 1: Import `zoomTo`**

In `src/components/ChartDock.tsx`, the viewport import currently reads:

```tsx
import { PRESETS, zoomDepth, SPAN_BOUNDS } from '@/chart/viewport';
```

Change it to:

```tsx
import { PRESETS, zoomDepth, SPAN_BOUNDS, zoomTo } from '@/chart/viewport';
```

- [ ] **Step 2: Add the `−` / `+` button row**

In `src/components/ChartDock.tsx`, inside the Zoom group, insert a button row directly after the `<div className="wb-label">Zoom</div>` line and before the `⊟ FULL WAVE` button:

```tsx
        <div className="flex gap-1">
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Zoom out"
            onClick={() => setView(zoomTo(view, center, 1.25))}
          >
            −
          </button>
          <button
            type="button"
            className="wb-btn wb-out flex-1 font-bold"
            aria-label="Zoom in"
            onClick={() => setView(zoomTo(view, center, 0.8))}
          >
            +
          </button>
        </div>
```

(`center` is already defined in the component as `(view.tLeft + view.tRight) / 2`; `zoomTo` clamps to `LIMITS`, so the buttons are safe at the zoom extremes.)

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChartDock.tsx
git commit -m "feat: on-screen zoom in/out buttons for gesture-free zoom"
```

---

## Task 6: Touch-sized tap targets

**Files:**
- Modify: `src/app/globals.css`

Verified live in Task 7.

- [ ] **Step 1: Add a coarse-pointer rule for buttons**

In `src/app/globals.css`, directly after the `.wb-btn--on { background: var(--wb-orange); }` line, add:

```css
/* Touch devices: enlarge push-button hit areas toward the ~44px guideline
   without bulking up the compact desktop chrome. */
@media (pointer: coarse) {
  .wb-btn { padding-top: 8px; padding-bottom: 8px; }
}
```

- [ ] **Step 2: Verify the build still compiles CSS**

Run: `npm run build`
Expected: build completes (static export to `out/`) with no CSS/compile errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: enlarge tap targets on touch devices"
```

---

## Task 7: Full verification (unit, build, live)

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm run test`
Expected: all tests pass, including `src/chart/__tests__/gestures.test.ts` and the existing chart/component suites.

- [ ] **Step 2: Typecheck and lint the whole project**

Run: `npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: successful static export to `out/`.

- [ ] **Step 4: Live verification at a phone viewport**

Start the dev server (`npm run dev`) and drive it with Playwright (the project's `run`/`verify` skills or the Playwright MCP) at a 375×667 viewport. Confirm:
  - The dock renders **below** the chart (stacked), not to its right.
  - A **tap** on the chart shows a novelty readout in the title bar / `LiveReadout`.
  - A **single-finger drag** pans; the readout/title instant updates.
  - A **two-finger pinch** zooms (the Span/Depth gauge in the dock changes).
  - The **`+` / `−`** buttons zoom in/out.
  - Dock buttons are comfortably tappable (visibly taller than on desktop).
  - The top nav (Chart / Help / About / Share) does not overflow at 360px — if it does, tighten the `gap-3` on the `<nav>` in `src/components/WorkbenchFrame.tsx` to `gap-2` and re-check.

- [ ] **Step 5: Final commit (only if Step 4 required a nav tweak)**

```bash
git add src/components/WorkbenchFrame.tsx
git commit -m "fix: tighten top-nav spacing so it fits narrow screens"
```

---

## Self-Review Notes

- **Spec coverage:** viewport meta (Task 2), stacked layout (Task 4), pinch + tap-to-read + multi-touch pan (Tasks 1 & 3), on-screen zoom buttons (Task 5), tap targets (Task 6), nav overflow check (Task 7 Step 4). All spec sections map to a task.
- **Type consistency:** `Pt`, `distance`, `midpoint`, `isTap`, `TAP_MOVE_PX` are defined in Task 1 and consumed in Task 3. The `gesture` ref's `pan`/`pinch` shapes are used consistently across down/move/end handlers. `zoomTo`/`panBy`/`xToT` signatures match `src/chart/viewport.ts`.
- **No placeholders:** every code step shows the full code; every command shows expected output.

# Subproject D — PWA (installable + offline) + default-to-now — Design

**Date:** 2026-06-06
**Status:** Approved (brainstorming)

## Goal

Make Timewave Zero 2 an installable, offline-capable PWA, and have the chart
default to "now" when opened with no shared link. No new npm dependencies (respects
the project's 7-day package-age supply-chain gate).

## Key decisions (from brainstorming)

- **Service worker: hand-rolled, full precache.** A dependency-free SW precaches the
  whole app shell + data at install, so the app works offline even on first
  navigation after install.
- **Icon: a hexagram glyph** (orange lines on Amiga blue `#0055aa`/`#ff8800`).
- **Default view: now centered, ~130y** (today's `t` at the current default span).
- Static export on GitHub Pages under `basePath` (`/timewave-zero-2`); everything is
  base-path-aware via `NEXT_PUBLIC_BASE_PATH`.

## Components

### 1. Manifest — `src/app/manifest.ts`

Next metadata route emitting `manifest.webmanifest`. Base-path-aware:

```
name: "Timewave Zero 2"
short_name: "Timewave"
start_url:  `${base}/`
scope:      `${base}/`
display:    "standalone"
theme_color / background_color: "#0055aa"
icons: 192, 512, and a maskable 512 (purpose "maskable")
```

where `base = process.env.NEXT_PUBLIC_BASE_PATH ?? ''`. Next links the manifest
automatically; also set `metadata.manifest` if needed for the export.

### 2. Icons — `public/icons/`

An SVG hexagram mark (six bars — solid = yang, split = yin — in `#ff8800` on a
`#0055aa` field) is the source of truth. It is rasterized to:

- `icon-192.png` (192×192)
- `icon-512.png` (512×512)
- `maskable-512.png` (512×512, art inset to the maskable safe zone)
- `apple-touch-180.png` (180×180)

**Rasterization is controller-run via Playwright** (render the SVG at each size and
screenshot) — no image-processing npm dependency. PNGs are committed. Referenced
from the manifest and from `metadata.icons` (apple-touch). The existing
`src/app/favicon.ico` stays.

### 3. Service worker — `scripts/build-sw.mjs` + `public/sw.template.js` → `out/sw.js`

`scripts/build-sw.mjs` runs **after** `next build` (wired into the `build` npm
script). It:

1. Scans `out/` for cacheable files: exported HTML, `_next/static/**`
   (hashed JS/CSS), `fonts/**`, `icons/**`, `data/**` (the `.json`/`.bin` bins),
   `manifest.webmanifest`, and root assets.
2. Builds a precache list of base-path-prefixed URLs and a cache version =
   short hash of the file list + their sizes (so a content change busts the cache).
3. Writes `out/sw.js` from `public/sw.template.js`, replacing `__PRECACHE__` and
   `__VERSION__` placeholders.

The SW behaviour:

- `install` → open `cache-${VERSION}`, `addAll(PRECACHE)`, `skipWaiting()`.
- `activate` → delete caches whose name ≠ current, `clients.claim()`.
- `fetch` (GET, same-origin) → **cache-first**, fall back to network (and populate
  cache on miss); for `navigate` requests, fall back to the cached app shell
  (`${base}/index.html`) when offline.
- Non-GET / cross-origin → passthrough (network).

`public/sw.template.js` is copied to `out/sw.js` by Next on export, then overwritten
by the build script with the real list — so the template's placeholders never ship.

### 4. Registration — `src/components/ServiceWorkerRegister.tsx`

`'use client'`, rendered once in `layout.tsx`. On mount, **production only**
(`process.env.NODE_ENV === 'production'`) and when `'serviceWorker' in navigator`,
register `${base}/sw.js` with `scope: ${base}/`. Skipped in `next dev` to avoid
caching during development. Renders nothing.

### 5. Default to now — `src/state/urlSync.ts` + `src/state/ChartProvider.tsx`

Add to `urlSync`:

```ts
export function homeView(): Viewport {
  const span = DEFAULT_VIEW.tLeft - DEFAULT_VIEW.tRight;   // current ~130y default
  const c = dateToT(new Date());
  return clamp({ tLeft: c + span / 2, tRight: c - span / 2 });
}
```

`ChartProvider`'s existing mount effect (which reads the URL once post-mount) uses
`homeView()` when there are **no** `l`/`r`/`d` params, instead of `DEFAULT_VIEW`.
`DEFAULT_VIEW` stays a static module constant for the initial `useState` (so the
server-prerendered title bar matches the client's first render — no hydration
mismatch); the now-centering happens client-side in the effect, exactly like the
existing URL sync.

## File structure

```
src/app/manifest.ts                       # web manifest (base-path-aware)
src/app/layout.tsx                        # (modify) icons metadata + <ServiceWorkerRegister/>
src/components/ServiceWorkerRegister.tsx  # prod-only SW registration
public/sw.template.js                     # SW source with __PRECACHE__/__VERSION__ placeholders
public/icons/{icon-192,icon-512,maskable-512,apple-touch-180}.png  # committed (controller-rasterized)
public/icons/icon.svg                     # the source mark
scripts/build-sw.mjs                      # post-build: scan out/, emit out/sw.js
src/state/urlSync.ts                      # (modify) add homeView()
src/state/ChartProvider.tsx               # (modify) no-params → homeView()
package.json                              # (modify) build: next build && node scripts/build-sw.mjs
```

## Testing

- **Unit (Vitest):** `homeView()` centers on `dateToT(new Date())` within tolerance
  and preserves the default span; `urlSync` no-params behaviour unchanged for the
  pure `parseView` (homeView is applied in ChartProvider, not parseView).
- **Unit (Node):** the `build-sw` file-collection + URL-prefixing function on a tiny
  fixture directory (extract it as a pure function imported by a test).
- **Live (controller):** `npm run build` then `npx serve out -l 3001`; Playwright —
  confirm `manifest.webmanifest` + icons load, the SW registers and activates, then
  emulate **offline**, reload, and confirm the app shell + chart + oracle still load
  from cache. Confirm the chart opens centered on ~now.

## Out of scope

- Push notifications, background sync, app-store packaging.
- A custom install prompt UI (rely on the browser's native install affordance).
- Precache cache-size optimization beyond "precache the committed assets" (the ~5 MB
  data bins are intentionally precached for full offline oracle use).

## Risks / mitigations

- **Stale content after deploy** → cache version is derived from file contents;
  `skipWaiting` + `clients.claim` activate the new SW promptly; old caches deleted on
  activate.
- **SW during development** → registration is production-only; dev never caches.
- **basePath / custom domain** → all URLs derive from `NEXT_PUBLIC_BASE_PATH`
  (empty string disables the prefix), matching the existing config.
- **Hydration** → `homeView()` runs only in the post-mount effect; SSR uses the
  static `DEFAULT_VIEW`.

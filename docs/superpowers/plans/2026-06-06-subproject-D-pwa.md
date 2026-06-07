# Subproject D — PWA + default-to-now Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Timewave Zero 2 an installable, offline-capable PWA (hand-rolled full-precache service worker, manifest, hexagram icons) and default the chart to "now" when opened with no shared link — no new npm dependencies.

**Architecture:** A post-build Node script scans `out/` and bakes a content-versioned precache list into `out/sw.js` from a template; a prod-only client component registers it. A base-path-aware `app/manifest.ts` + committed PNG icons (rasterized via Playwright) complete the install metadata. `homeView()` recenters the initial view on today, applied post-mount like the existing URL sync.

**Tech Stack:** Next 16 static export, React 19, TypeScript, a vanilla Service Worker (no deps), Node ESM build script; Vitest; Playwright for live offline verification.

**Spec:** `docs/superpowers/specs/2026-06-06-subproject-D-pwa-design.md`

**Base path:** everything derives from `process.env.NEXT_PUBLIC_BASE_PATH` (the deploy workflow sets it; `??` default `/timewave-zero-2` for the SW script, `?? ''` for client/manifest where Next already manages prefixing). Empty string disables the prefix (local testing).

---

## File Structure

```
src/state/urlSync.ts                       # (modify) add homeView()
src/state/ChartProvider.tsx                # (modify) no-params → homeView()
src/state/__tests__/urlSync.homeView.test.ts
scripts/build-sw.mjs                        # pure buildPrecache() + main() (writes out/sw.js)
scripts/build-sw.test.mjs                   # unit test for buildPrecache()
public/sw.template.js                       # SW source w/ __VERSION__/__PRECACHE__/__SHELL__
vitest.config.ts                            # (modify) also scan scripts/**/*.test.mjs
package.json                                # (modify) build: next build && node scripts/build-sw.mjs
src/app/manifest.ts                         # base-path-aware web manifest
src/app/__tests__/manifest.test.ts
src/components/ServiceWorkerRegister.tsx    # prod-only registration
src/app/layout.tsx                          # (modify) <ServiceWorkerRegister/> + apple icon
public/icons/icon.svg                       # source mark (controller)
public/icons/{icon-192,icon-512,maskable-512,apple-touch-180}.png   # committed (controller)
```

---

## Task 1: Default-to-now (`homeView`)

**Files:**
- Modify: `src/state/urlSync.ts`
- Modify: `src/state/ChartProvider.tsx`
- Create: `src/state/__tests__/urlSync.homeView.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/state/__tests__/urlSync.homeView.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { homeView, DEFAULT_VIEW } from '@/state/urlSync';
import { dateToT } from '@/chart/time';

describe('homeView', () => {
  it('centers on today with the default span', () => {
    const v = homeView();
    const center = (v.tLeft + v.tRight) / 2;
    expect(center).toBeCloseTo(dateToT(new Date()), 0);   // within ~1 day
    expect(v.tLeft - v.tRight).toBeCloseTo(DEFAULT_VIEW.tLeft - DEFAULT_VIEW.tRight, 6);
    expect(v.tLeft).toBeGreaterThan(v.tRight);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/state/__tests__/urlSync.homeView.test.ts`
Expected: FAIL — `homeView` is not exported.

- [ ] **Step 3: Add `homeView` to `urlSync.ts`**

Append to `src/state/urlSync.ts` (after `parseView`):

```ts
/** The default "open on now" view: today centered at the default span. */
export function homeView(): Viewport {
  const span = DEFAULT_VIEW.tLeft - DEFAULT_VIEW.tRight;
  const c = dateToT(new Date());
  return clamp({ tLeft: c + span / 2, tRight: c - span / 2 });
}
```

(`clamp`, `dateToT`, `DEFAULT_VIEW`, `Viewport` are already imported/defined in the file.)

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/state/__tests__/urlSync.homeView.test.ts`
Expected: PASS.

- [ ] **Step 5: Use `homeView` in `ChartProvider` when there are no URL params**

In `src/state/ChartProvider.tsx`, update the import and the mount effect. Change the import line:

```ts
import { DEFAULT_VIEW, serializeView, parseView } from '@/state/urlSync';
```
to:
```ts
import { DEFAULT_VIEW, serializeView, parseView, homeView } from '@/state/urlSync';
```

Replace the mount effect body (the `useEffect(() => { const parsed = parseView(...) ... }, [])`) with:

```ts
  useEffect(() => {
    const read = () => {
      const s = new URLSearchParams(window.location.search);
      const hasParams = s.has('l') || s.has('r') || s.has('d');
      const parsed = parseView(s);
      if (parsed.error) console.warn(parsed.error);
      return hasParams ? parsed.view : homeView();
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from URL/now (external) once on mount
    setViewRaw(read());
    didHydrate.current = true;
    const onPop = () => setViewRaw(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
```

- [ ] **Step 6: Typecheck, lint, full test**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: no errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/state/urlSync.ts src/state/ChartProvider.tsx src/state/__tests__/urlSync.homeView.test.ts
git commit -m "feat: default the chart to now on open (homeView)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 2: Service worker build tooling

**Files:**
- Create: `public/sw.template.js`
- Create: `scripts/build-sw.mjs`
- Create: `scripts/build-sw.test.mjs`
- Modify: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Let Vitest scan the scripts test**

In `vitest.config.ts`, change the `include` line:

```ts
    include: ['src/**/*.test.{ts,tsx}'],
```
to:
```ts
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
```

- [ ] **Step 2: Write the failing test**

Create `scripts/build-sw.test.mjs`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildPrecache } from './build-sw.mjs';

let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'swtest-'));
  mkdirSync(join(dir, '_next', 'static'), { recursive: true });
  mkdirSync(join(dir, 'data'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<html></html>');
  writeFileSync(join(dir, '_next', 'static', 'app.js'), 'x');
  writeFileSync(join(dir, 'data', 'hexagrams.json'), '{}');
  writeFileSync(join(dir, 'app.js.map'), 'map');   // excluded (not cacheable ext)
  writeFileSync(join(dir, 'sw.js'), 'old');         // excluded (the SW itself)
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('buildPrecache', () => {
  it('collects cacheable files, base-prefixed, excluding sw.js and maps', () => {
    const { urls, version } = buildPrecache(dir, '/base');
    expect(urls).toContain('/base/index.html');
    expect(urls).toContain('/base/_next/static/app.js');
    expect(urls).toContain('/base/data/hexagrams.json');
    expect(urls).not.toContain('/base/sw.js');
    expect(urls.some((u) => u.endsWith('.map'))).toBe(false);
    expect(version).toMatch(/^[0-9a-f]{12}$/);
  });

  it('version changes when a file changes', () => {
    const a = buildPrecache(dir, '/base').version;
    writeFileSync(join(dir, 'index.html'), '<html>changed-bigger</html>');
    expect(buildPrecache(dir, '/base').version).not.toBe(a);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run scripts/build-sw.test.mjs`
Expected: FAIL — cannot resolve `./build-sw.mjs`.

- [ ] **Step 4: Implement `scripts/build-sw.mjs`**

```js
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const CACHEABLE = /\.(html|js|css|json|bin|woff2?|ttf|png|svg|ico|webmanifest)$/i;

/** Recursively list every file under dir. */
export function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

/**
 * Build the precache URL list + a content-derived version for an exported `out/`
 * dir. URLs are base-path-prefixed; the SW itself and source maps are excluded.
 */
export function buildPrecache(outDir, base) {
  const files = listFiles(outDir)
    .filter((f) => CACHEABLE.test(f))
    .filter((f) => relative(outDir, f).replace(/\\/g, '/') !== 'sw.js')
    .filter((f) => !f.endsWith('sw.template.js'))
    .sort();
  const urls = [];
  const hash = createHash('sha256');
  for (const f of files) {
    const rel = relative(outDir, f).replace(/\\/g, '/');
    urls.push(`${base}/${rel}`);
    hash.update(rel);
    hash.update(String(statSync(f).size));
  }
  return { urls, version: hash.digest('hex').slice(0, 12) };
}

function main() {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const outDir = join(here, '..', 'out');
  const templatePath = join(here, '..', 'public', 'sw.template.js');
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '/timewave-zero-2';
  const { urls, version } = buildPrecache(outDir, base);
  const sw = readFileSync(templatePath, 'utf8')
    .replace('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(urls))
    .replace('__SHELL__', `${base}/index.html`);
  writeFileSync(join(outDir, 'sw.js'), sw);
  process.stderr.write(`sw.js: ${urls.length} files precached, version ${version}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run scripts/build-sw.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 6: Create the SW template**

Create `public/sw.template.js`:

```js
/* eslint-disable */
// Generated into out/sw.js by scripts/build-sw.mjs (placeholders replaced at build).
const VERSION = '__VERSION__';
const CACHE = `twz-${VERSION}`;
const PRECACHE = __PRECACHE__;
const SHELL = '__SHELL__';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => (req.mode === 'navigate' ? caches.match(SHELL) : Response.error())),
    ),
  );
});
```

- [ ] **Step 7: Wire the build script + verify lint ignores the SW source**

In `package.json`, change:
```json
    "build": "next build",
```
to:
```json
    "build": "next build && node scripts/build-sw.mjs",
```

Run: `npm run lint`
Expected: no errors. If ESLint flags `public/sw.template.js`, add an `ignores` entry for `public/**` to `eslint.config.mjs` and re-run until clean.

- [ ] **Step 8: End-to-end build check (generates out/sw.js)**

Run: `npm run build`
Expected: build completes and prints `sw.js: <N> files precached, version <hash>`. Verify:
`node -e "const s=require('fs').readFileSync('out/sw.js','utf8'); if(!/twz-[0-9a-f]{12}/.test(s)||s.includes('__PRECACHE__')) throw new Error('sw.js not generated'); console.log('out/sw.js OK')"`
Expected: `out/sw.js OK`.

- [ ] **Step 9: Commit**

```bash
git add public/sw.template.js scripts/build-sw.mjs scripts/build-sw.test.mjs vitest.config.ts package.json eslint.config.mjs
git commit -m "feat: full-precache service worker generated post-build"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 3: Web manifest

**Files:**
- Create: `src/app/manifest.ts`
- Create: `src/app/__tests__/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/__tests__/manifest.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest';
import manifest from '@/app/manifest';

const orig = process.env.NEXT_PUBLIC_BASE_PATH;
afterEach(() => { process.env.NEXT_PUBLIC_BASE_PATH = orig; });

describe('manifest', () => {
  it('is standalone with base-prefixed start_url and icons', () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/timewave-zero-2';
    const m = manifest();
    expect(m.name).toBe('Timewave Zero 2');
    expect(m.display).toBe('standalone');
    expect(m.start_url).toBe('/timewave-zero-2/');
    expect(m.icons?.every((i) => i.src.startsWith('/timewave-zero-2/icons/'))).toBe(true);
    expect(m.icons?.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('falls back to no prefix when base path is unset', () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(manifest().start_url).toBe('/');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/app/__tests__/manifest.test.ts`
Expected: FAIL — cannot resolve `@/app/manifest`.

- [ ] **Step 3: Implement `src/app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return {
    name: 'Timewave Zero 2',
    short_name: 'Timewave',
    description: 'The Sheliak timewave as an interactive DOS-style oracle.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#0055aa',
    theme_color: '#0055aa',
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${base}/icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/app/__tests__/manifest.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts src/app/__tests__/manifest.test.ts
git commit -m "feat: base-path-aware web app manifest"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 4: Service-worker registration + layout wiring

**Files:**
- Create: `src/components/ServiceWorkerRegister.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Implement the registration component**

Create `src/components/ServiceWorkerRegister.tsx`:

```tsx
'use client';
import { useEffect } from 'react';

/**
 * Registers the precaching service worker in production only (skipped in `next dev`
 * so development never caches). Base-path-aware. Renders nothing.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {});
  }, []);
  return null;
}
```

- [ ] **Step 2: Wire it into the layout + apple icon**

In `src/app/layout.tsx`:

Add the import near the top:
```ts
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
```

Add an `icons` field to the existing `metadata` object (Next prefixes metadata icon URLs with the base path automatically — use a root-relative path, do NOT add the base manually here):
```ts
  icons: { apple: '/icons/apple-touch-180.png' },
```

Render the component inside `<body>`, right after `<WorkbenchFrame>{children}</WorkbenchFrame>`:
```tsx
      <body>
        <WorkbenchFrame>{children}</WorkbenchFrame>
        <ServiceWorkerRegister />
      </body>
```

- [ ] **Step 3: Typecheck, lint, test**

Run: `npm run typecheck && npm run lint && npm run test`
Expected: no errors; all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ServiceWorkerRegister.tsx src/app/layout.tsx
git commit -m "feat: register the service worker (prod only) + apple-touch icon"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 5: Icons (controller-run)

**Files:**
- Create: `public/icons/icon.svg`
- Create (committed): `public/icons/{icon-192,icon-512,maskable-512,apple-touch-180}.png`

> **Controller:** author the SVG, then rasterize each PNG with Playwright (render the SVG at the target pixel size and screenshot) — no image npm dependency. Commit the SVG + PNGs.

- [ ] **Step 1: Author `public/icons/icon.svg`**

A 512×512 mark: solid blue `#0055aa` field; a hexagram of six horizontal `#ff8800` bars (yang = one full bar; yin = two bars with a centered gap), centered in the inner ~62% (maskable-safe). Example structure (6 lines, top→bottom, mix of yang/yin):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0055aa"/>
  <g fill="#ff8800">
    <!-- yang -->        <rect x="160" y="120" width="192" height="26" rx="4"/>
    <!-- yin  --> <rect x="160" y="170" width="78" height="26" rx="4"/><rect x="274" y="170" width="78" height="26" rx="4"/>
    <!-- yang -->        <rect x="160" y="220" width="192" height="26" rx="4"/>
    <!-- yang -->        <rect x="160" y="270" width="192" height="26" rx="4"/>
    <!-- yin  --> <rect x="160" y="320" width="78" height="26" rx="4"/><rect x="274" y="320" width="78" height="26" rx="4"/>
    <!-- yang -->        <rect x="160" y="370" width="192" height="26" rx="4"/>
  </g>
</svg>
```

- [ ] **Step 2: Rasterize to PNGs with Playwright**

For each `(name, size)` in `icon-192:192`, `icon-512:512`, `maskable-512:512`, `apple-touch-180:180`: load the SVG scaled to `size`×`size` in the browser at that viewport and screenshot to `public/icons/<name>.png`. (For `maskable-512`, the art already sits inside the safe zone on a full-bleed blue field, so the same SVG is correct.) Verify each PNG exists and is `size`×`size`.

- [ ] **Step 3: Commit**

```bash
git add public/icons
git commit -m "feat: hexagram PWA icons (svg source + rasterized png set)"
```
Append trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: Full verification (controller-run)

**Files:** none.

- [ ] **Step 1: Production build (root base path)**

Run: `npm run build`
Expected: completes; `out/sw.js`, `out/manifest.webmanifest`, and `out/icons/*.png` exist; `out/sw.js` contains a `twz-<hash>` cache name and a non-empty precache array.

- [ ] **Step 2: Build + serve with an empty base path for local SW testing**

Run: `NEXT_PUBLIC_BASE_PATH='' npm run build && npx serve out -l 3001 &` (then wait for ready).
(Empty base path serves correctly at `http://localhost:3001/` and makes the SW scope `/`.)

- [ ] **Step 3: Live verification (Playwright)**

  - Load `http://localhost:3001/` — confirm `manifest.webmanifest` and an icon load (200), and the chart opens **centered on ~now** (title instant ≈ current year).
  - Confirm the service worker registers and reaches `activated`
    (`navigator.serviceWorker.ready`).
  - Reload once (populate cache), then **emulate offline** and reload — the app
    shell + chart + oracle still load (served from cache); no fatal errors.

- [ ] **Step 4: Stop the server and report**

Stop `serve`. Report precache file count, that offline load worked, and that the app defaults to now.

---

## Self-Review Notes

- **Spec coverage:** manifest (Task 3); icons (Task 5); SW template + post-build generator + registration (Tasks 2, 4); default-to-now (Task 1); base-path handling (all); testing unit + live (Tasks 1–3, 6). Out-of-scope items (push, install-prompt UI) are excluded.
- **Type/name consistency:** `buildPrecache(outDir, base)` defined in Task 2, used by its `main()` and tested in Task 2. `homeView()` defined in Task 1 (urlSync) and consumed in ChartProvider (Task 1). Manifest icon paths (`${base}/icons/...`, manual prefix because manifest JSON isn't auto-prefixed) vs layout `metadata.icons.apple` (`/icons/...`, Next auto-prefixes) — the distinction is intentional and noted. SW placeholders `__VERSION__`/`__PRECACHE__`/`__SHELL__` in the template match the three `.replace()` calls in `main()`.
- **No placeholders:** every code/command step is concrete; the only runtime-variable values are the precache count/version (Tasks 2, 6) and the rasterized PNG bytes (Task 5, controller).
```

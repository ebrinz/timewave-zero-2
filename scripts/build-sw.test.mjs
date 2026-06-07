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

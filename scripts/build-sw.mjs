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
    .replaceAll('__VERSION__', version)
    .replace('__PRECACHE__', JSON.stringify(urls))
    .replace('__SHELL__', `${base}/index.html`);
  writeFileSync(join(outDir, 'sw.js'), sw);
  process.stderr.write(`sw.js: ${urls.length} files precached, version ${version}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();

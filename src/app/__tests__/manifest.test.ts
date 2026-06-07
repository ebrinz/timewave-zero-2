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

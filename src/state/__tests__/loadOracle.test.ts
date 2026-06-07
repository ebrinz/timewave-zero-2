import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadHexagrams } from '@/state/loadOracle';

beforeEach(() => { vi.restoreAllMocks(); });

describe('loadHexagrams', () => {
  it('returns data when wave_variant matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
      json: async () => ({ wave_variant: 'sheliak-tw1', hexagrams: [] }) })));
    expect(await loadHexagrams()).toEqual({ wave_variant: 'sheliak-tw1', hexagrams: [] });
  });

  it('returns null on wave_variant mismatch', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true,
      json: async () => ({ wave_variant: 'other', hexagrams: [] }) })));
    expect(await loadHexagrams()).toBeNull();
  });

  it('returns null on 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await loadHexagrams()).toBeNull();
  });
});

import { WAVE_VARIANT } from '@/chart/timewave';
import type { HexagramsData } from '@/chart/oracle/reading';
import { readQuantizedBin, readFloatBin, type VectorSet } from '@/chart/oracle/quant';

const base = (): string => process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** Eager: the tiny judgment JSON. Null on 404 or wave_variant mismatch. */
export async function loadHexagrams(): Promise<HexagramsData | null> {
  try {
    const res = await fetch(`${base()}/data/hexagrams.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as HexagramsData;
    if (json.wave_variant !== WAVE_VARIANT) {
      console.error(`hexagrams.json wave_variant "${json.wave_variant}" != "${WAVE_VARIANT}"`);
      return null;
    }
    return json;
  } catch {
    return null;
  }
}

async function fetchBin(path: string, read: (b: ArrayBuffer) => VectorSet): Promise<VectorSet | null> {
  try {
    const res = await fetch(`${base()}${path}`);
    if (!res.ok) return null;
    return read(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Lazy: the int8 word-vector table for the cloud. */
export const loadGlove = (): Promise<VectorSet | null> => fetchBin('/data/glove_q.bin', readQuantizedBin);
/** Lazy: the hexagram centroids (float32). */
export const loadHexVectors = (): Promise<VectorSet | null> => fetchBin('/data/hexagrams_64.bin', readFloatBin);
/** Lazy: the event centroids (float32) for resonance. */
export const loadEventVectors = (): Promise<VectorSet | null> => fetchBin('/data/events.bin', readFloatBin);

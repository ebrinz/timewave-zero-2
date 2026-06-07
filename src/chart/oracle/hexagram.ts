import type { Viewport } from '@/chart/viewport';

/** The hexagram governing a viewport: its King Wen ordinal (0..63), number (1..64),
 *  and Unicode glyph (䷀..䷿). */
export interface ActiveHexagram { ordinal: number; kingWen: number; glyph: string; }

const log64 = (n: number): number => Math.log(n) / Math.log(64);

/**
 * Read the active hexagram from the data set (384 cells = 64 hexagrams × 6 yao) at
 * the viewport center, at a fractal scale set by the zoom octave: a wider view shows
 * roughly one full 64-hexagram cycle; each 64× dive advances the scale by one.
 */
export function activeHexagram(view: Viewport): ActiveHexagram {
  const span = view.tLeft - view.tRight;
  const x = Math.abs((view.tLeft + view.tRight) / 2);
  const s = Math.max(0, Math.round(log64(384 / span)));
  const index = ((Math.floor(x * 64 ** s) % 384) + 384) % 384;
  const ordinal = Math.floor(index / 6);
  return { ordinal, kingWen: ordinal + 1, glyph: String.fromCodePoint(0x4dc0 + ordinal) };
}

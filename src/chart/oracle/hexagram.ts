import type { Viewport } from '@/chart/viewport';

/** The hexagram governing a viewport: its King Wen ordinal (0..63), number (1..64),
 *  and Unicode glyph (䷀..䷿). */
export interface ActiveHexagram { ordinal: number; kingWen: number; glyph: string; }

const log64 = (n: number): number => Math.log(n) / Math.log(64);

/**
 * Read the hexagram governing a specific time `t` (days-before-zero) at a fractal
 * scale set by the visible `span`'s zoom octave (a wider view shows ~one full
 * 64-hexagram cycle; each 64× dive advances the scale by one).
 */
export function activeHexagramAt(t: number, span: number): ActiveHexagram {
  const x = Math.abs(t);
  const s = Math.max(0, Math.round(log64(384 / span)));
  const index = ((Math.floor(x * 64 ** s) % 384) + 384) % 384;
  const ordinal = Math.floor(index / 6);
  return { ordinal, kingWen: ordinal + 1, glyph: String.fromCodePoint(0x4dc0 + ordinal) };
}

/** The hexagram governing a viewport (its center time). */
export function activeHexagram(view: Viewport): ActiveHexagram {
  return activeHexagramAt((view.tLeft + view.tRight) / 2, view.tLeft - view.tRight);
}

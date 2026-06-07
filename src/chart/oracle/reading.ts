import { cosineTopK, type VectorSet } from './quant';

/** One hexagram's content (from public/data/hexagrams.json). */
export interface Hexagram {
  n: number; glyph: string; name: string; judgment: string; image: string; seedWords: string[];
}
export interface HexagramsData { wave_variant: string; hexagrams: Hexagram[]; }

/** Nearest GloVe words to the hexagram centroid — the word cloud. */
export function wordCloud(hexVec: Float32Array, glove: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, glove, k).map((e) => e.word);
}

/** Nearest event ids (names in the events VectorSet are Wikidata QIDs). */
export function resonantEvents(hexVec: Float32Array, events: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, events, k).map((e) => e.word);
}

/** A terse oracular line: the judgment's first sentence woven with two cloud words. */
export function composeReading(hex: Hexagram, cloudWords: string[]): string {
  const first = (hex.judgment.split(/(?<=[.!?])\s/)[0] || hex.judgment).trim();
  const tail = cloudWords.slice(0, 2).join(', ');
  return tail ? `${first} — ${tail}.` : first;
}

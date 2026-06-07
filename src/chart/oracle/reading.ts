import { cosineTopK, type VectorSet } from './quant';
import type { WaveState } from './wave';

/** One hexagram's content (from public/data/hexagrams.json). */
export interface Hexagram {
  n: number; glyph: string; name: string; judgment: string; lines: string[]; seedWords: string[];
}
export interface HexagramsData { wave_variant: string; hexagrams: Hexagram[]; }

/** Weak/connective words that pollute a word cloud. */
const WEAK = new Set([
  'the', 'and', 'of', 'to', 'in', 'a', 'an', 'that', 'it', 'its', 'is', 'for', 'on',
  'with', 'as', 'by', 'this', 'but', 'or', 'from', 'at', 'be', 'are', 'was', 'will',
  'would', 'could', 'should', 'one', 'all', 'when', 'then', 'so', 'if', 'not', 'no',
  'out', 'up', 'they', 'them', 'we', 'you', 'he', 'she', 'her', 'his', 'which', 'what',
  'who', 'can', 'may', 'more', 'most', 'than', 'too', 'very', 'just', 'about', 'into',
  'over', 'after', 'before', 'these', 'those', 'here', 'there', 'now', 'also', 'only',
  'back', 'come', 'comes', 'coming', 'bring', 'brings', 'way', 'ways', 'because',
]);

/** Nearest GloVe words to the hexagram centroid, weak words filtered out. */
export function wordCloud(hexVec: Float32Array, glove: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, glove, Math.max(k * 3, 24))
    .map((e) => e.word)
    .filter((w) => !WEAK.has(w))
    .slice(0, k);
}

/** Nearest event ids (names in the events VectorSet are Wikidata QIDs). */
export function resonantEvents(hexVec: Float32Array, events: VectorSet, k: number): string[] {
  return cosineTopK(hexVec, events, k).map((e) => e.word);
}

const POSITION = [
  'below, the beginning', 'the inner, central place', 'the threshold',
  'the outer, transition', 'the place of honour, central', 'beyond, the culmination',
];

/** Our gloss: the line position, the wave's tendency + trend, and two cloud words.
 *  (The traditional Judgment + line text are rendered separately by the panel.) */
export function composeReading(line: number, ws: WaveState, cloud: string[]): string {
  const pos = POSITION[line - 1] ?? '';
  const trend = ws.trend === 'deepening' ? 'the wave runs deep and falling'
    : ws.trend === 'returning' ? 'the wave rises' : 'the wave holds steady';
  const tendency = ws.tendency === 'ingression' ? 'the new ingressing'
    : ws.tendency === 'entrenchment' ? 'habit entrenching' : 'in transition';
  const tail = cloud.slice(0, 2).join(', ');
  return `Line ${line} (${pos}). ${trend} — ${tendency}.${tail ? ` — ${tail}.` : ''}`;
}

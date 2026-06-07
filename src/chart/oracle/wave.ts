import { novelty } from '@/chart/timewave';
import type { Viewport } from '@/chart/viewport';

export type Tendency = 'ingression' | 'transition' | 'entrenchment';
export type Trend = 'deepening' | 'returning' | 'steady';
export interface WaveState { tendency: Tendency; trend: Trend; value: number; rank: number; }

/** Pure classification of a wave value within a [min,max] range, plus the value
 *  just ahead in time. Low value = high novelty (ingression); falling toward the
 *  future = novelty deepening. */
export function classifyWave(value: number, min: number, max: number, ahead: number): WaveState {
  const range = max - min;
  const rank = range > 0 ? (value - min) / range : 0.5;
  const tendency: Tendency = rank < 0.34 ? 'ingression' : rank > 0.66 ? 'entrenchment' : 'transition';
  const d = ahead - value;
  const trend: Trend = Math.abs(d) < (range || 1) * 0.02 ? 'steady' : d < 0 ? 'deepening' : 'returning';
  return { tendency, trend, value, rank };
}

/** Wave state at time `t`, ranked within the visible window's novelty range. */
export function waveState(t: number, view: Viewport): WaveState {
  const span = view.tLeft - view.tRight;
  const N = 24;
  let min = Infinity, max = -Infinity;
  for (let i = 0; i <= N; i++) {
    const s = novelty(view.tRight + (span * i) / N);
    if (s < min) min = s;
    if (s > max) max = s;
  }
  return classifyWave(novelty(t), min, max, novelty(t - span * 0.02)); // smaller t = later
}

/** Short badge, e.g. "▼ novelty deepening". */
export function waveBadge(ws: WaveState): string {
  const arrow = ws.trend === 'deepening' ? '▼' : ws.trend === 'returning' ? '▲' : '■';
  const label = ws.tendency === 'ingression' ? 'novelty' : ws.tendency === 'entrenchment' ? 'habit' : 'transition';
  return `${arrow} ${label} ${ws.trend}`;
}

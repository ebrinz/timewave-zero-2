import type { OverlayLayer } from './types';
import { xToT, type Dims, type Viewport } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';

const PAD_TOP = 30, PAD_BOT = 30, SUPERSAMPLE = 4;

interface WaveStyle { fill: string; edge: string; width: number; dash: number[]; }
const ORIGINAL: WaveStyle = { fill: 'rgba(90,150,230,0.22)', edge: '#ffffff', width: 1.4, dash: [] };
const GHOST: WaveStyle = { fill: 'rgba(90,150,230,0.10)', edge: 'rgba(120,170,255,0.55)', width: 1, dash: [4, 4] };
const BIRTH: WaveStyle = { fill: 'rgba(255,150,40,0.20)', edge: '#ffcc66', width: 1.6, dash: [] };

interface Env { mins: number[]; maxs: number[]; }

// Sample the novelty envelope for one wave (shifted in t by `offset`).
function sample(view: Viewport, dims: Dims, cols: number, offset: number): Env {
  const mins = new Array<number>(cols), maxs = new Array<number>(cols);
  for (let c = 0; c < cols; c++) {
    let lo = Infinity, hi = -Infinity;
    for (let s = 0; s < SUPERSAMPLE; s++) {
      const x = ((c + s / SUPERSAMPLE) / cols) * dims.w;
      const n = novelty(xToT(x, view, dims.w) + offset);
      if (n < lo) lo = n; if (n > hi) hi = n;
    }
    mins[c] = lo; maxs[c] = hi;
  }
  return { mins, maxs };
}

export function createWaveLayer(opts: { offset: number | null; showBackground: boolean }): OverlayLayer {
  return {
    id: 'wave',
    visible: () => true,
    draw(ctx, view, dims) {
      const usableH = dims.h - PAD_TOP - PAD_BOT;
      const cols = Math.min(dims.w, 2000);

      // Back-to-front draw list. Birthwave off = the original single wave; on =
      // optional 2012 ghost behind the amber birth wave.
      const waves: { env: Env; style: WaveStyle }[] = [];
      if (opts.offset === null) {
        waves.push({ env: sample(view, dims, cols, 0), style: ORIGINAL });
      } else {
        if (opts.showBackground) waves.push({ env: sample(view, dims, cols, 0), style: GHOST });
        waves.push({ env: sample(view, dims, cols, opts.offset), style: BIRTH });
      }

      // Shared vertical fit across every drawn wave so they're directly comparable.
      let vMin = Infinity, vMax = -Infinity;
      for (const { env } of waves) for (let c = 0; c < cols; c++) {
        if (env.mins[c] < vMin) vMin = env.mins[c];
        if (env.maxs[c] > vMax) vMax = env.maxs[c];
      }
      const HEADROOM = 0.07;
      const rawRange = vMax - vMin;
      if (rawRange > 0) { const pad = rawRange * HEADROOM; vMin -= pad; vMax += pad; }
      else { vMin -= 1; vMax += 1; }
      const range = vMax - vMin;
      const yOf = (v: number) => PAD_TOP + (1 - (v - vMin) / range) * usableH;

      for (const { env, style } of waves) {
        // Envelope fill.
        ctx.beginPath();
        for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; if (c === 0) ctx.moveTo(x, yOf(env.maxs[c])); else ctx.lineTo(x, yOf(env.maxs[c])); }
        for (let c = cols - 1; c >= 0; c--) { const x = (c / cols) * dims.w; ctx.lineTo(x, yOf(env.mins[c])); }
        ctx.closePath();
        ctx.fillStyle = style.fill; ctx.fill();
        // Top edge.
        ctx.strokeStyle = style.edge; ctx.lineWidth = style.width; ctx.setLineDash(style.dash);
        ctx.beginPath();
        for (let c = 0; c < cols; c++) { const x = (c / cols) * dims.w; if (c === 0) ctx.moveTo(x, yOf(env.maxs[c])); else ctx.lineTo(x, yOf(env.maxs[c])); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },
  };
}

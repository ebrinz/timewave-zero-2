import type { OverlayLayer } from './types';
import { xToT } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';

const PAD_TOP = 30, PAD_BOT = 30, SUPERSAMPLE = 4;

export const WaveLayer: OverlayLayer = {
  id: 'wave',
  visible: () => true,
  draw(ctx, view, dims) {
    const usableH = dims.h - PAD_TOP - PAD_BOT;
    const cols = Math.min(dims.w, 2000);
    const mins = new Array<number>(cols), maxs = new Array<number>(cols);
    let vMin = Infinity, vMax = -Infinity;
    for (let c = 0; c < cols; c++) {
      let lo = Infinity, hi = -Infinity;
      for (let s = 0; s < SUPERSAMPLE; s++) {
        const x = ((c + s / SUPERSAMPLE) / cols) * dims.w;
        const n = novelty(xToT(x, view, dims.w));
        if (n < lo) lo = n; if (n > hi) hi = n;
      }
      mins[c] = lo; maxs[c] = hi;
      if (lo < vMin) vMin = lo; if (hi > vMax) vMax = hi;
    }
    // Auto-fit to the visible window so the wave fills the frame at ANY zoom depth
    // — this is what preserves "dramatic amplitude" as you dive into the fractal.
    // The pad MUST be relative to the actual amplitude (not a fixed absolute
    // floor): as you zoom in, raw novelty variation shrinks far below any absolute
    // epsilon, so an absolute floor would squash the wave to a flat line. HEADROOM
    // keeps crests/troughs off the exact edges. Only a genuinely flat slice
    // (rawRange == 0, i.e. precision death) falls back to a centered line.
    const HEADROOM = 0.07;
    const rawRange = vMax - vMin;
    if (rawRange > 0) {
      const pad = rawRange * HEADROOM;
      vMin -= pad; vMax += pad;
    } else {
      vMin -= 1; vMax += 1; // degenerate: draw a flat centered line
    }
    const range = vMax - vMin;
    const yOf = (v: number) => PAD_TOP + (1 - (v - vMin) / range) * usableH; // higher novelty value = lower on screen
    // envelope fill
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * dims.w;
      if (c === 0) ctx.moveTo(x, yOf(maxs[c])); else ctx.lineTo(x, yOf(maxs[c]));
    }
    for (let c = cols - 1; c >= 0; c--) { const x = (c / cols) * dims.w; ctx.lineTo(x, yOf(mins[c])); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(90,150,230,0.22)'; ctx.fill();
    // crisp top edge — bright Amiga white over the blue envelope
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * dims.w;
      if (c === 0) ctx.moveTo(x, yOf(maxs[c])); else ctx.lineTo(x, yOf(maxs[c]));
    }
    ctx.stroke();
  },
};

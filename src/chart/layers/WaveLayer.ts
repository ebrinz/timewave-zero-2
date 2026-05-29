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
    const range = Math.max(1e-6, vMax - vMin);
    const yOf = (v: number) => PAD_TOP + (1 - (v - vMin) / range) * usableH; // higher novelty value = lower on screen
    // envelope fill
    ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * dims.w;
      if (c === 0) ctx.moveTo(x, yOf(maxs[c])); else ctx.lineTo(x, yOf(maxs[c]));
    }
    for (let c = cols - 1; c >= 0; c--) { const x = (c / cols) * dims.w; ctx.lineTo(x, yOf(mins[c])); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(80,255,140,0.18)'; ctx.fill();
    // crisp top edge
    ctx.strokeStyle = '#7fff9e'; ctx.lineWidth = 1.4; ctx.beginPath();
    for (let c = 0; c < cols; c++) {
      const x = (c / cols) * dims.w;
      if (c === 0) ctx.moveTo(x, yOf(maxs[c])); else ctx.lineTo(x, yOf(maxs[c]));
    }
    ctx.stroke();
  },
};

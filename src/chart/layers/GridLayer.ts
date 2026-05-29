import type { OverlayLayer } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT, tToDate, yearToDate } from '@/chart/time';

const YEAR = 365.25;
function tickStep(spanYears: number): number {
  if (spanYears < 5) return 1; if (spanYears < 25) return 5; if (spanYears < 120) return 10;
  if (spanYears < 600) return 50; if (spanYears < 3000) return 250; if (spanYears < 15000) return 1000;
  return Math.pow(10, Math.floor(Math.log10(spanYears / 8)));
}

export const GridLayer: OverlayLayer = {
  id: 'grid',
  visible: () => true,
  draw(ctx, view, dims) {
    ctx.strokeStyle = 'rgba(64,255,150,0.10)';
    ctx.fillStyle = 'rgba(127,255,127,0.55)';
    ctx.font = '13px "VT323", ui-monospace, monospace';
    const spanYears = (view.tLeft - view.tRight) / YEAR;
    const step = tickStep(spanYears);
    const yL = tToDate(view.tLeft).getUTCFullYear();
    const yR = tToDate(view.tRight).getUTCFullYear();
    for (let yr = Math.ceil(yL/step)*step; yr <= Math.floor(yR/step)*step; yr += step) {
      const t = dateToT(yearToDate(yr));
      const x = tToX(t, view, dims.w);
      if (x < 0 || x > dims.w) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
      ctx.fillText(yr < 0 ? `${-yr}BC` : `${yr}`, x + 4, dims.h - 6);
    }
  },
};

import type { OverlayLayer } from './types';
import { tToX } from '@/chart/viewport';
import { timeTicks } from '@/chart/time';

export const GridLayer: OverlayLayer = {
  id: 'grid',
  visible: () => true,
  draw(ctx, view, dims) {
    ctx.strokeStyle = 'rgba(120,170,255,0.16)';
    ctx.fillStyle = 'rgba(200,220,255,0.65)';
    ctx.font = '13px "VT323", ui-monospace, monospace';
    for (const { t, label } of timeTicks(view.tLeft, view.tRight)) {
      const x = tToX(t, view, dims.w);
      if (x < 0 || x > dims.w) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
      ctx.fillText(label, x + 4, dims.h - 6);
    }
  },
};

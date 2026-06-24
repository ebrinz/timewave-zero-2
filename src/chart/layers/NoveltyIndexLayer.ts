import type { OverlayLayer } from './types';
import { xToT } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';
import { wellProximity } from '@/chart/noveltyIndex';

const SAMPLES = 256;

export function createNoveltyIndexLayer(opts: { offset: number | null }): OverlayLayer {
  return {
    id: 'novelty-index',
    visible: () => true,
    draw(ctx, view, dims) {
      const off = opts.offset ?? 0;
      const s = new Array<number>(SAMPLES);
      for (let i = 0; i < SAMPLES; i++) {
        const x = ((i + 0.5) / SAMPLES) * dims.w;
        s[i] = novelty(xToT(x, view, dims.w) + off);
      }
      const { proximity, hasWell } = wellProximity(s, Math.floor(SAMPLES / 2));
      const dots = hasWell ? Math.round(proximity * 5) : 0;
      const bar = '●'.repeat(dots) + '○'.repeat(5 - dots);
      const label = hasWell ? `NOVELTY WELL ${bar} ${proximity.toFixed(2)}` : 'NOVELTY WELL —';

      const pad = 8;
      ctx.save();
      ctx.font = '13px "VT323", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      // Amber when reading the birth wave, cool white for the 2012 wave.
      ctx.fillStyle = opts.offset !== null ? '#ffcc66' : 'rgba(200,220,255,0.85)';
      ctx.fillText(label, dims.w - pad, pad);
      ctx.restore();
    },
  };
}

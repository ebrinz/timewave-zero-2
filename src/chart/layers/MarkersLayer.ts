import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT, yearToDate } from '@/chart/time';

const yearT = (y: number) => dateToT(yearToDate(y));

const NOW_COLOR = '#00e676';   // phosphor green — the present moment ("you are here")

export const MARKERS = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444' },
  { t: yearT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearT(1492), label: '1492', color: '#ffb84a' },
  { t: yearT(1), label: 'Year 1 CE', color: '#ffb84a' },
] as const;

/** All markers including the live present-moment "NOW" line (recomputed each
 *  draw so it always reflects the real current instant). */
const allMarkers = () => [
  { t: dateToT(new Date()), label: 'NOW', color: NOW_COLOR },
  ...MARKERS,
];

export const MarkersLayer: OverlayLayer = {
  id: 'markers',
  visible: () => true,
  draw(ctx, view, dims) {
    ctx.font = '11px "VT323", ui-monospace, monospace';
    for (const m of allMarkers()) {
      const x = tToX(m.t, view, dims.w);
      if (x < -50 || x > dims.w + 50) continue;
      const solid = m.t === 0 || m.color === NOW_COLOR;
      ctx.strokeStyle = m.color + (m.color === NOW_COLOR ? 'cc' : '55');
      ctx.lineWidth = solid ? 2 : 1;
      ctx.setLineDash(solid ? [] : [4, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = m.color; ctx.fillText(m.label, x + 4, 14);
    }
  },
  hitTest(x, _y, view, dims): HitResult | null {
    for (const m of allMarkers()) { if (Math.abs(tToX(m.t, view, dims.w) - x) < 4) return { kind: 'marker', t: m.t, label: m.label }; }
    return null;
  },
};

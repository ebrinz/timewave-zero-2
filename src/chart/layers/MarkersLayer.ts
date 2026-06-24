import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { dateToT, yearToDate } from '@/chart/time';
import { parseBirthday, birthZeroDate, formatBirthday } from '@/state/birthwave';

const yearT = (y: number) => dateToT(yearToDate(y));

const NOW_COLOR = '#00e676';   // phosphor green — the present moment ("you are here")
const BIRTH_COLOR = '#ffaa33';  // amber — the personal anchor

// Fixed historical markers (2012 zero point + events). `anchor2012` flags the one
// marker that belongs to the 2012 wave, so it can dim when the ghost is hidden.
// Exported for legacy tests.
export const MARKERS = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444' },
  { t: yearT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearT(1492), label: '1492', color: '#ffb84a' },
  { t: yearT(1), label: 'Year 1 CE', color: '#ffb84a' },
] as const;

const BASE = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444', anchor2012: true },
  { t: yearT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearT(1492), label: '1492', color: '#ffb84a' },
  { t: yearT(1), label: 'Year 1 CE', color: '#ffb84a' },
] as const;

interface Marker { t: number; label: string; color: string; solid: boolean; dim: boolean; }

export function createMarkersLayer(opts: { offset: number | null; birthday: string | null; showBackground: boolean }): OverlayLayer {
  // Recomputed each draw so NOW reflects the real current instant.
  const markers = (): Marker[] => {
    const list: Marker[] = [
      { t: dateToT(new Date()), label: 'NOW', color: NOW_COLOR, solid: true, dim: false },
      ...BASE.map((m) => ({
        t: m.t, label: m.label, color: m.color,
        solid: m.t === 0,
        dim: 'anchor2012' in m && m.anchor2012 === true && opts.offset !== null && !opts.showBackground,
      })),
    ];
    if (opts.offset !== null && opts.birthday) {
      const bd = parseBirthday(opts.birthday);
      if (bd) {
        list.push({ t: -opts.offset, label: `BIRTH ZERO · ${formatBirthday(birthZeroDate(bd))}`, color: BIRTH_COLOR, solid: true, dim: false });
        list.push({ t: dateToT(bd), label: `BORN · ${formatBirthday(bd)}`, color: BIRTH_COLOR, solid: false, dim: true });
      }
    }
    return list;
  };

  return {
    id: 'markers',
    visible: () => true,
    draw(ctx, view, dims) {
      ctx.font = '11px "VT323", ui-monospace, monospace';
      for (const m of markers()) {
        const x = tToX(m.t, view, dims.w);
        if (x < -50 || x > dims.w + 50) continue;
        const alphaHex = m.color === NOW_COLOR ? 'cc' : m.dim ? '22' : '55';
        ctx.strokeStyle = m.color + alphaHex;
        ctx.lineWidth = m.solid ? 2 : 1;
        ctx.setLineDash(m.solid ? [] : [4, 4]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, dims.h); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = m.dim ? 0.5 : 1;
        ctx.fillStyle = m.color; ctx.fillText(m.label, x + 4, 14);
        ctx.globalAlpha = 1;
      }
    },
    hitTest(x, _y, view, dims): HitResult | null {
      let best: Marker | null = null;
      let bestDist = 4;
      for (const m of markers()) {
        const d = Math.abs(tToX(m.t, view, dims.w) - x);
        if (d < bestDist) { best = m; bestDist = d; }
      }
      return best ? { kind: 'marker', t: best.t, label: best.label } : null;
    },
  };
}

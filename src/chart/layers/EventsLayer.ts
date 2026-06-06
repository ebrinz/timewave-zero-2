import type { OverlayLayer, HitResult } from './types';
import { tToX } from '@/chart/viewport';
import { selectVisibleEvents, type EventsData } from '@/chart/events';

const EVENT_COLOR = '#ff8800';        // --wb-orange (canvas needs a literal, not a CSS var)
const LABEL_Y = 26;                   // below the hand-coded MARKERS label row (y=14)

/**
 * Renders historical events as dashed amber ticks + truncated labels, density
 * managed by selectVisibleEvents. A factory so the loader can rebuild the layer
 * with freshly-fetched data (new object → ChartCanvas redraws). Null data → inert.
 */
export function createEventsLayer(data: EventsData | null): OverlayLayer {
  return {
    id: 'events',
    visible: () => !!data && data.events.length > 0,
    draw(ctx, view, dims) {
      if (!data) return;
      const maxLabels = Math.max(3, Math.floor(dims.w / 90));
      ctx.font = '11px "VT323", ui-monospace, monospace';
      ctx.fillStyle = EVENT_COLOR;
      ctx.strokeStyle = EVENT_COLOR;
      for (const e of selectVisibleEvents(data.events, view, dims, maxLabels)) {
        const x = tToX(e.t, view, dims.w);
        if (x < -50 || x > dims.w + 50) continue;
        ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.moveTo(x, LABEL_Y + 4); ctx.lineTo(x, dims.h); ctx.stroke();
        ctx.setLineDash([]);
        const label = e.title.length > 22 ? `${e.title.slice(0, 21)}…` : e.title;
        ctx.fillText(label, x + 3, LABEL_Y);
      }
    },
    hitTest(x, _y, view, dims): HitResult | null {
      if (!data) return null;
      for (const e of data.events) {
        if (Math.abs(tToX(e.t, view, dims.w) - x) < 4) {
          return { kind: 'event', t: e.t, label: `${e.title} · ${e.date}` };
        }
      }
      return null;
    },
  };
}

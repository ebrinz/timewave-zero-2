import type { OverlayLayer } from './types';
import { activeHexagram } from '@/chart/oracle/hexagram';

/**
 * A faint watermark of the hexagram governing the current view, drawn behind the
 * wave so the chart itself reflects the active reading. First in the layer stack
 * (painted on the black fill, under grid/wave/markers). Updates as you pan/dive.
 */
export const HexagramBgLayer: OverlayLayer = {
  id: 'hexbg',
  visible: () => true,
  draw(ctx, view, dims) {
    const { glyph } = activeHexagram(view);
    ctx.save();
    ctx.font = `${Math.min(dims.w, dims.h) * 0.8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 136, 0, 0.07)'; // faint amber, matches the theme accent
    ctx.fillText(glyph, dims.w / 2, dims.h / 2);
    ctx.restore();
  },
};

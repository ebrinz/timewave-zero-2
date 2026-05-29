import type { Viewport, Dims } from '@/chart/viewport';

export interface HitResult { kind: string; t: number; label?: string; }

export interface OverlayLayer {
  id: string;
  visible: (view: Viewport) => boolean;
  draw: (ctx: CanvasRenderingContext2D, view: Viewport, dims: Dims, data?: unknown) => void;
  hitTest?: (x: number, y: number, view: Viewport, dims: Dims) => HitResult | null;
}

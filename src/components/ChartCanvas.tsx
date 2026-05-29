'use client';
import { useEffect, useRef, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { xToT, zoomTo, panBy, type Dims } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';

export function ChartCanvas() {
  const { view, setView, hover, setHover, layers } = useChart();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 800, h: 480 });
  const drag = useRef<{ x: number; view: typeof view } | null>(null);

  // Responsive sizing via ResizeObserver (client-only).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setDims({ w: Math.max(320, Math.floor(r.width)), h: Math.max(320, Math.floor(r.height)) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw: DPR-aware, layered, one rAF per view/dims change.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return; // graceful fallback if 2D canvas unsupported
    const dpr = window.devicePixelRatio || 1;
    c.width = dims.w * dpr;
    c.height = dims.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, dims.w, dims.h);
    ctx.fillStyle = '#06090a';
    ctx.fillRect(0, 0, dims.w, dims.h);
    const raf = requestAnimationFrame(() => {
      for (const l of layers) {
        if (l.visible(view)) l.draw(ctx, view, dims, (l as { data?: unknown }).data);
      }
      if (hover) {
        ctx.strokeStyle = 'rgba(127,255,127,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, dims.h); ctx.stroke();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [view, dims, layers, hover]);

  const onWheel = (e: React.WheelEvent) => {
    const x = e.nativeEvent.offsetX;
    setView(zoomTo(view, xToT(x, view, dims.w), e.deltaY > 0 ? 1.1 : 0.9));
  };
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.nativeEvent.offsetX, view };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const x = e.nativeEvent.offsetX;
    if (drag.current) {
      const span = drag.current.view.tLeft - drag.current.view.tRight;
      const dt = ((x - drag.current.x) / dims.w) * span;
      setView(panBy(drag.current.view, dt));
    } else {
      const t = xToT(x, view, dims.w);
      setHover({ t, x, y: e.nativeEvent.offsetY, novelty: novelty(t) });
    }
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-label="Timewave novelty chart"
        style={{ width: dims.w, height: dims.h, touchAction: 'none' }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { drag.current = null; setHover(null); }}
      />
    </div>
  );
}

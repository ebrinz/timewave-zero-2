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

  // Latest view/dims for the imperative wheel listener (attached once, below).
  // Synced in an effect — writing refs during render is disallowed.
  const viewRef = useRef(view);
  const dimsRef = useRef(dims);
  useEffect(() => { viewRef.current = view; dimsRef.current = dims; });

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
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, dims.w, dims.h);
    const raf = requestAnimationFrame(() => {
      for (const l of layers) {
        if (l.visible(view)) l.draw(ctx, view, dims, (l as { data?: unknown }).data);
      }
      if (hover) {
        ctx.strokeStyle = 'rgba(255,136,0,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, dims.h); ctx.stroke();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [view, dims, layers, hover]);

  // Wheel-zoom is attached as a NON-PASSIVE native listener so preventDefault()
  // actually fires — React's synthetic onWheel is passive, which lets a trackpad
  // pinch (ctrl+wheel) zoom the whole browser page and a scroll bubble out of the
  // panel. Confining it here keeps zoom strictly inside the chart, anchored at the
  // cursor's time. (Refs supply the latest view/dims without re-subscribing.)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current, w = dimsRef.current.w;
      setView(zoomTo(v, xToT(e.offsetX, v, w), e.deltaY > 0 ? 1.1 : 0.9));
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [setView]);
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => { drag.current = null; setHover(null); }}
      />
    </div>
  );
}

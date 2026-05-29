'use client';
import { useEffect, useRef, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import type { Dims } from '@/chart/viewport';

export function ChartCanvas() {
  const { view, layers } = useChart();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 800, h: 480 });

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
    });
    return () => cancelAnimationFrame(raf);
  }, [view, dims, layers]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} aria-label="Timewave novelty chart" style={{ width: dims.w, height: dims.h }} />
    </div>
  );
}

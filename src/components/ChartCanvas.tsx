'use client';
import { useEffect, useRef, useState } from 'react';
import { useChart } from '@/state/ChartProvider';
import { xToT, zoomTo, panBy, type Dims, type Viewport } from '@/chart/viewport';
import { novelty } from '@/chart/timewave';
import { tToDate, formatInstant } from '@/chart/time';
import { activeHexagramAt } from '@/chart/oracle/hexagram';
import { distance, midpoint, isTap, type Pt } from '@/chart/gestures';

export function ChartCanvas() {
  const { view, setView, hover, setHover, layers } = useChart();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dims, setDims] = useState<Dims>({ w: 800, h: 480 });
  // Active pointers (mouse or touch), keyed by pointerId, for multi-touch.
  const pointers = useRef(new Map<number, Pt>());
  // The in-flight gesture. A one-finger 'pan' records the view + start point at
  // press time and the max travel since (a travel-free release reads as a tap).
  // A two-finger 'pinch' tracks the last finger distance to derive a per-frame
  // zoom ratio.
  const gesture = useRef<
    | { kind: 'pan'; startX: number; startY: number; view: Viewport; moved: number }
    | { kind: 'pinch'; lastDist: number }
    | null
  >(null);

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
      setDims({ w: Math.max(320, Math.floor(r.width)), h: Math.max(160, Math.floor(r.height)) });
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
      // Faint watermark of the hexagram governing the selected time (the hovered
      // point, else the view centre), with that instant labelled beneath it.
      const span = view.tLeft - view.tRight;
      const selT = hover ? hover.t : (view.tLeft + view.tRight) / 2;
      const g = Math.min(dims.w, dims.h) * 0.7;
      const cx = dims.w / 2, cy = dims.h / 2;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,136,0,0.16)';
      ctx.font = `${g}px serif`;
      ctx.fillText(activeHexagramAt(selT, span).glyph, cx, cy);
      ctx.fillStyle = 'rgba(255,136,0,0.55)';
      ctx.font = '13px "VT323", ui-monospace, monospace';
      ctx.fillText(formatInstant(tToDate(selT), span), cx, cy + g * 0.42 + 6);
      ctx.restore();

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
  const ptOf = (e: React.PointerEvent): Pt => ({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });

  const onPointerDown = (e: React.PointerEvent) => {
    // Capture so a finger/cursor that drifts off the canvas keeps driving the
    // gesture. Tolerate environments where the pointer isn't capturable.
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId); } catch { /* no-op */ }
    pointers.current.set(e.pointerId, ptOf(e));
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', lastDist: distance(a, b) };
    } else {
      const p = ptOf(e);
      gesture.current = { kind: 'pan', startX: p.x, startY: p.y, view: viewRef.current, moved: 0 };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = ptOf(e);
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    const g = gesture.current;

    if (g?.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = distance(a, b);
      if (dist > 0) {
        const mid = midpoint(a, b);
        const v = viewRef.current, w = dimsRef.current.w;
        setView(zoomTo(v, xToT(mid.x, v, w), g.lastDist / dist));
        g.lastDist = dist;
      }
      return;
    }

    if (g?.kind === 'pan') {
      g.moved = Math.max(g.moved, Math.hypot(p.x - g.startX, p.y - g.startY));
      const span = g.view.tLeft - g.view.tRight;
      const dt = ((p.x - g.startX) / dimsRef.current.w) * span;
      setView(panBy(g.view, dt));
      return;
    }

    // No active gesture → mouse hover (touch never moves without a pointer down).
    if (pointers.current.size === 0) {
      const v = viewRef.current;
      const t = xToT(p.x, v, dimsRef.current.w);
      setHover({ t, x: p.x, y: p.y, novelty: novelty(t) });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    const g = gesture.current;
    const p = ptOf(e);
    pointers.current.delete(e.pointerId);

    // A travel-free one-finger release is a tap → drop a persistent readout.
    if (g?.kind === 'pan' && isTap(g.moved)) {
      const v = viewRef.current;
      const t = xToT(p.x, v, dimsRef.current.w);
      setHover({ t, x: p.x, y: p.y, novelty: novelty(t) });
    }

    // Re-derive the gesture from whatever fingers remain down.
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = { kind: 'pinch', lastDist: distance(a, b) };
    } else if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      gesture.current = { kind: 'pan', startX: only.x, startY: only.y, view: viewRef.current, moved: 0 };
    } else {
      gesture.current = null;
    }
  };

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-label="Timewave novelty chart"
        style={{ width: dims.w, height: dims.h, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => {
          // Only the mouse "leaves" without a release; touch is cleaned up on
          // up/cancel (with capture, leave doesn't fire mid-pinch).
          if (e.pointerType === 'mouse') {
            pointers.current.delete(e.pointerId);
            gesture.current = null;
            setHover(null);
          }
        }}
      />
    </div>
  );
}

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ════════════════════════════════════════════════════════════════
//  TIMEWAVE ZERO — recreation of Peter Meyer's 1980s DOS program
//  based on Terence McKenna's theory from "The Invisible Landscape"
// ════════════════════════════════════════════════════════════════

// The 64 hexagrams of the I Ching in King Wen sequence,
// encoded as 6-bit integers (bit 0 = bottom line; 1 = yang/solid)
const KING_WEN = [
  63, 0, 17, 34, 23, 58, 2, 16, 55, 59, 7, 56, 61, 47, 4, 8,
  25, 38, 3, 48, 41, 37, 32, 1, 57, 39, 33, 30, 18, 45, 28, 14,
  60, 15, 40, 5, 53, 43, 20, 10, 35, 49, 31, 62, 24, 6, 26, 22,
  29, 46, 9, 36, 52, 11, 13, 44, 54, 27, 50, 19, 51, 12, 21, 42,
];

const popcount = (n) => { let c = 0; while (n) { c += n & 1; n >>>= 1; } return c; };

// First-order difference array — number of changing lines between
// consecutive hexagrams in the King Wen sequence (wrapping 64→1).
// This is the "seed" of the timewave.
const FOD = KING_WEN.map((h, i) => popcount(h ^ KING_WEN[(i + 1) % 64]));

// Multi-scale fractal sum: the wave at time t is built from FOD samples
// at periods of 64, 64², 64³ ... days. This produces self-similarity
// at every zoom level — McKenna's central claim about temporal structure.
function timewaveRaw(t) {
  const a = Math.abs(t);
  let v = 0;
  for (let s = 0; s < 9; s++) {
    const period = Math.pow(64, s + 1);
    const phase = ((a % period) / period) * 64;
    const i = Math.floor(phase) % 64;
    const frac = phase - Math.floor(phase);
    const interp = FOD[i] * (1 - frac) + FOD[(i + 1) % 64] * frac;
    v += interp / Math.pow(1.7, s);
  }
  return v;
}

const ZERO_VAL = timewaveRaw(0); // value at the singularity
function novelty(t) {
  // "Distance from zero" — 0 at the eschaton, higher in past or future
  return Math.abs(timewaveRaw(t) - ZERO_VAL) / ZERO_VAL;
}

// Dec 21, 2012 — McKenna's chosen end date (winter solstice,
// end of the 13th baktun in the Maya Long Count)
const END_DATE = new Date(Date.UTC(2012, 11, 21, 12, 0, 0)).getTime();
const DAY_MS = 86400000;

const dateToT = (d) => (END_DATE - (d instanceof Date ? d.getTime() : d)) / DAY_MS;
const tToDate = (t) => new Date(END_DATE - t * DAY_MS);
const yearToT = (y) => dateToT(new Date(Date.UTC(y, 5, 15)));

function formatDate(d, compact = false) {
  const y = d.getUTCFullYear();
  if (compact) {
    if (Math.abs(y) >= 10000) return (y / 1000).toFixed(0) + 'k';
    return y < 0 ? `${-y} BCE` : `${y}`;
  }
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()];
  return `${mo} ${d.getUTCDate()}, ${y < 0 ? -y + ' BCE' : y + ' CE'}`;
}

// Named markers shown on the chart
const MARKERS = [
  { t: 0, label: 'ZERO POINT · 21 DEC 2012', color: '#ff4444' },
  { t: yearToT(1969), label: 'Apollo 11', color: '#ffb84a' },
  { t: yearToT(1945), label: 'Trinity', color: '#ffb84a' },
  { t: yearToT(1492), label: '1492', color: '#ffb84a' },
  { t: yearToT(1), label: 'Year 1 CE', color: '#ffb84a' },
];

const PRESETS = [
  { label: '1y',   span: 365 },
  { label: '10y',  span: 3650 },
  { label: '100y', span: 36500 },
  { label: '1ky',  span: 365000 },
  { label: '10ky', span: 3650000 },
];

export default function TimewaveZero() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 480 });

  // Viewport: tLeft = past edge (larger t), tRight = future edge (smaller t)
  const [view, setView] = useState({
    tLeft: yearToT(1900),
    tRight: yearToT(2030),
  });

  const [hover, setHover] = useState(null);
  const dragRef = useRef(null);
  const pinchRef = useRef(null);

  // Responsive sizing
  useEffect(() => {
    const update = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: Math.max(320, r.width), h: Math.max(360, Math.min(560, r.width * 0.6)) });
    };
    update();
    const ro = new ResizeObserver(update);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Coordinate mapping
  const tToX = useCallback((t) => ((view.tLeft - t) / (view.tLeft - view.tRight)) * size.w, [view, size.w]);
  const xToT = useCallback((x) => view.tLeft - (x / size.w) * (view.tLeft - view.tRight), [view, size.w]);

  // Render the wave
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.w, size.h);

    // Background
    ctx.fillStyle = '#06090a';
    ctx.fillRect(0, 0, size.w, size.h);

    // Subtle grid
    ctx.strokeStyle = 'rgba(64,255,150,0.06)';
    ctx.lineWidth = 1;
    for (let gy = 0; gy <= 8; gy++) {
      const y = (gy / 8) * size.h;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.w, y); ctx.stroke();
    }

    // Year ticks — adaptive density
    const spanYears = (view.tLeft - view.tRight) / 365.25;
    let tickStep;
    if (spanYears < 5) tickStep = 1;
    else if (spanYears < 25) tickStep = 5;
    else if (spanYears < 120) tickStep = 10;
    else if (spanYears < 600) tickStep = 50;
    else if (spanYears < 3000) tickStep = 250;
    else if (spanYears < 15000) tickStep = 1000;
    else tickStep = Math.pow(10, Math.floor(Math.log10(spanYears / 8)));

    const yLeft = tToDate(view.tLeft).getUTCFullYear();
    const yRight = tToDate(view.tRight).getUTCFullYear();
    const yStart = Math.ceil(yLeft / tickStep) * tickStep;
    const yEnd = Math.floor(yRight / tickStep) * tickStep;

    ctx.fillStyle = 'rgba(127,255,127,0.55)';
    ctx.font = '13px "VT323", ui-monospace, monospace';
    ctx.strokeStyle = 'rgba(64,255,150,0.10)';
    for (let yr = yStart; yr <= yEnd; yr += tickStep) {
      const x = tToX(yearToT(yr));
      if (x < 0 || x > size.w) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.h); ctx.stroke();
      ctx.fillText(yr < 0 ? `${-yr}BC` : `${yr}`, x + 4, size.h - 6);
    }

    // Markers (vertical lines for key dates)
    MARKERS.forEach((m) => {
      const x = tToX(m.t);
      if (x < -50 || x > size.w + 50) return;
      ctx.strokeStyle = m.color + '55';
      ctx.lineWidth = m.t === 0 ? 2 : 1;
      ctx.setLineDash(m.t === 0 ? [] : [4, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.h); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = m.color;
      ctx.font = '11px "VT323", ui-monospace, monospace';
      ctx.save();
      ctx.translate(x + 4, 14);
      ctx.fillText(m.label, 0, 0);
      ctx.restore();
    });

    // Compute & draw the wave
    const samples = Math.min(size.w * 2, 2000);
    const padTop = 30;
    const padBot = 30;
    const usableH = size.h - padTop - padBot;

    const values = new Array(samples);
    let vMin = Infinity, vMax = -Infinity;
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * size.w;
      const t = xToT(x);
      const n = novelty(t);
      values[i] = n;
      if (n < vMin) vMin = n;
      if (n > vMax) vMax = n;
    }
    const vRange = Math.max(0.001, vMax - vMin);

    // Glow pass (thicker, translucent)
    ctx.strokeStyle = 'rgba(80,255,140,0.18)';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * size.w;
      const y = padTop + (1 - (values[i] - vMin) / vRange) * usableH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Main wave
    ctx.strokeStyle = '#7fff9e';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * size.w;
      const y = padTop + (1 - (values[i] - vMin) / vRange) * usableH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Y-axis label
    ctx.fillStyle = 'rgba(127,255,127,0.45)';
    ctx.font = '12px "VT323", ui-monospace, monospace';
    ctx.fillText('▲ NOVELTY', 8, 18);
    ctx.fillText('▼ HABIT', 8, size.h - 22);
  }, [view, size, tToX, xToT]);

  // Pan / zoom handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const tAtMouse = xToT(mx);
    const factor = Math.exp(e.deltaY * 0.0015);
    const newSpan = (view.tLeft - view.tRight) * factor;
    const fracL = (view.tLeft - tAtMouse) / (view.tLeft - view.tRight);
    setView({
      tLeft: tAtMouse + newSpan * fracL,
      tRight: tAtMouse - newSpan * (1 - fracL),
    });
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    canvasRef.current.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, view: { ...view }, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = xToT(x);
    setHover({ x, t, n: novelty(t) });

    if (dragRef.current && dragRef.current.id === e.pointerId) {
      const dx = e.clientX - dragRef.current.x;
      const span = dragRef.current.view.tLeft - dragRef.current.view.tRight;
      const shift = (dx / size.w) * span;
      setView({
        tLeft: dragRef.current.view.tLeft + shift,
        tRight: dragRef.current.view.tRight + shift,
      });
    }
  };

  const onPointerUp = (e) => {
    if (dragRef.current?.id === e.pointerId) dragRef.current = null;
  };

  const onPointerLeave = () => setHover(null);

  // Pinch zoom (two-touch)
  const touchesRef = useRef(new Map());
  const onTouchStart = (e) => {
    for (const t of e.touches) touchesRef.current.set(t.identifier, { x: t.clientX });
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchRef.current = {
        dist: Math.abs(a.clientX - b.clientX),
        midX: (a.clientX + b.clientX) / 2,
        view: { ...view },
      };
      dragRef.current = null;
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const newDist = Math.abs(a.clientX - b.clientX);
      const rect = canvasRef.current.getBoundingClientRect();
      const midX = (a.clientX + b.clientX) / 2 - rect.left;
      const factor = pinchRef.current.dist / Math.max(10, newDist);
      const oldView = pinchRef.current.view;
      const oldSpan = oldView.tLeft - oldView.tRight;
      const tAtMid = oldView.tLeft - (midX / size.w) * oldSpan;
      const newSpan = oldSpan * factor;
      const fracL = (oldView.tLeft - tAtMid) / oldSpan;
      setView({
        tLeft: tAtMid + newSpan * fracL,
        tRight: tAtMid - newSpan * (1 - fracL),
      });
    }
  };
  const onTouchEnd = (e) => {
    for (const t of e.changedTouches) touchesRef.current.delete(t.identifier);
    if (e.touches.length < 2) pinchRef.current = null;
  };

  // Programmatic actions
  const zoomBy = (f) => {
    const mid = (view.tLeft + view.tRight) / 2;
    const span = (view.tLeft - view.tRight) * f;
    setView({ tLeft: mid + span / 2, tRight: mid - span / 2 });
  };
  const setSpanDays = (days) => {
    const mid = (view.tLeft + view.tRight) / 2;
    setView({ tLeft: mid + days / 2, tRight: mid - days / 2 });
  };
  const jumpToZeroPoint = () => setView({ tLeft: 365 * 50, tRight: -365 * 20 });
  const reset = () => setView({ tLeft: yearToT(1900), tRight: yearToT(2030) });

  const spanYears = (view.tLeft - view.tRight) / 365.25;
  const spanLabel = spanYears < 2 ? `${(spanYears * 12).toFixed(1)} mo`
                  : spanYears < 1000 ? `${spanYears.toFixed(0)} yr`
                  : `${(spanYears / 1000).toFixed(1)} ky`;

  return (
    <div className="min-h-screen w-full" style={{ background: '#06090a', color: '#7fff9e' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=IBM+Plex+Mono:wght@400;600&display=swap');
        .tw-root { font-family: 'VT323', ui-monospace, monospace; }
        .tw-body { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
        .tw-scan::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0, transparent 2px,
            rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 3px
          );
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .tw-glow { text-shadow: 0 0 6px rgba(127,255,158,0.6), 0 0 16px rgba(127,255,158,0.25); }
        .tw-btn {
          background: transparent;
          border: 1px solid rgba(127,255,158,0.35);
          color: #7fff9e;
          padding: 6px 10px;
          font-family: 'VT323', monospace;
          font-size: 16px;
          letter-spacing: 0.05em;
          cursor: pointer;
          transition: all 120ms;
        }
        .tw-btn:hover, .tw-btn:active {
          background: rgba(127,255,158,0.12);
          border-color: #7fff9e;
          text-shadow: 0 0 4px rgba(127,255,158,0.8);
        }
        .tw-canvas { touch-action: none; cursor: grab; display: block; }
        .tw-canvas:active { cursor: grabbing; }
      `}</style>

      <div className="tw-root max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <header className="mb-5 sm:mb-8">
          <div className="text-xs tracking-widest opacity-60 mb-1">PETER MEYER · 1989 — RECREATION</div>
          <h1 className="tw-glow text-4xl sm:text-6xl leading-none" style={{ letterSpacing: '0.04em' }}>
            TIMEWAVE ZERO
          </h1>
          <div className="tw-body text-[11px] sm:text-xs mt-3 opacity-70 max-w-2xl leading-relaxed">
            A fractal wave constructed from the first-order differences of the King Wen
            sequence of I Ching hexagrams. Per McKenna, it correlates &ldquo;novelty&rdquo;
            with calendar time and converges to zero on 21 Dec 2012.
          </div>
        </header>

        <div ref={wrapRef} className="relative tw-scan rounded-sm overflow-hidden"
             style={{ border: '1px solid rgba(127,255,158,0.25)', background: '#06090a' }}>
          <canvas
            ref={canvasRef}
            className="tw-canvas"
            style={{ width: size.w + 'px', height: size.h + 'px' }}
            onWheel={handleWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerLeave}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          />
          {hover && (
            <div className="absolute pointer-events-none" style={{
              left: Math.min(Math.max(hover.x + 12, 8), size.w - 200),
              top: 38,
              background: 'rgba(6,9,10,0.85)',
              border: '1px solid rgba(127,255,158,0.4)',
              padding: '6px 10px',
              fontFamily: 'VT323, monospace',
              fontSize: '14px',
              color: '#7fff9e',
              minWidth: 180,
            }}>
              <div className="tw-glow">{formatDate(tToDate(hover.t))}</div>
              <div className="opacity-70 text-[12px]">novelty :: {hover.n.toFixed(5)}</div>
              <div className="opacity-50 text-[11px]">t = {hover.t.toFixed(0)} d</div>
            </div>
          )}
          <div className="absolute top-2 right-3 text-[11px] opacity-50">
            SPAN {spanLabel}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <button className="tw-btn" onClick={() => zoomBy(0.5)}>[ + ZOOM IN ]</button>
          <button className="tw-btn" onClick={() => zoomBy(2)}>[ − ZOOM OUT ]</button>
          <button className="tw-btn" onClick={jumpToZeroPoint}>[ &gt; ZERO POINT ]</button>
          <button className="tw-btn" onClick={reset}>[ RESET ]</button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-[12px] opacity-60 mr-1">SPAN:</span>
          {PRESETS.map((p) => (
            <button key={p.label} className="tw-btn" onClick={() => setSpanDays(p.span)}>
              {p.label}
            </button>
          ))}
        </div>

        <footer className="tw-body text-[10px] sm:text-[11px] opacity-50 mt-8 leading-relaxed max-w-2xl">
          <div>
            Algorithm: King Wen hexagram differences → 64-element seed → multi-scale
            fractal sum at periods 64, 64², 64³ ... days. Drag to pan, pinch or scroll
            to zoom. Not a prediction; a curiosity from the history of countercultural
            mathematics.
          </div>
        </footer>
      </div>
    </div>
  );
}

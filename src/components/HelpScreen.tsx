import Link from 'next/link';

export function HelpScreen() {
  return (
    <article className="max-w-[80ch] mx-auto p-6 space-y-4 leading-relaxed overflow-y-auto h-full">
      <h1 className="text-xl phosphor-glow">TIMEWAVE ZERO 2 — HELP</h1>

      {/* ── 1. What this is ────────────────────────────────────────── */}
      <section id="what">
        <h2 className="text-lg mb-1">1. What This Is</h2>
        <p>
          Timewave Zero is Terence McKenna&rsquo;s &ldquo;novelty theory&rdquo; — a speculative
          theoretical model proposing that the universe moves through cycles of increasing
          complexity (&ldquo;novelty&rdquo;) and entrenchment (&ldquo;habit&rdquo;), governed by a
          mathematical wave derived from the King Wen sequence of the I Ching. This site is an
          interactive, DOS-homage reboot of Peter Meyer&rsquo;s original Timewave Zero software. It
          is an art piece and an interactive model of a mathematical curiosity. Novelty theory has
          no empirical basis in physics or history, and this tool should not be used as a
          forecasting instrument.
        </p>
      </section>

      {/* ── 2. Y axis ──────────────────────────────────────────────── */}
      <section id="y-axis">
        <h2 className="text-lg mb-1">2. Reading the Chart — The Y Axis (Novelty)</h2>
        <p>
          The vertical axis plots the raw timewave value, which represents the degree of
          &ldquo;habit&rdquo; or entrenchment at a given moment.{' '}
          <strong>A low value means high novelty; a high value means high habit.</strong> The wave
          descends toward zero as it approaches the zero point on 21 December 2012, where it
          reaches its minimum — maximum novelty. In other words, <em>novelty increases downward</em>
          on this chart. When you see the wave dip, novelty is increasing; when the wave rises,
          habit is dominant.
        </p>
      </section>

      {/* ── 3. X axis ──────────────────────────────────────────────── */}
      <section id="x-axis">
        <h2 className="text-lg mb-1">3. Reading the Chart — The X Axis (Time)</h2>
        <p>
          The horizontal axis is time: the past is on the left, the future on the right. The zero
          point — where the wave reaches 0, its theoretical terminus — is{' '}
          <strong>21 December 2012</strong>, the date McKenna chose as the eschaton based on the
          Mayan Long Count calendar. Dates after 2012 (including today) are shown as a mirror of
          the approach to that point. McKenna&rsquo;s theory only defines the wave leading up to
          the zero point; the post-2012 portion is a visualization choice and is not part of the
          forward theory. Treat it accordingly.
        </p>
      </section>

      {/* ── 4. Markers ─────────────────────────────────────────────── */}
      <section id="markers">
        <h2 className="text-lg mb-1">4. The Markers</h2>
        <p>
          Several named historical dates are marked on the chart as vertical lines for reference:
        </p>
        <ul className="list-none space-y-1 ml-2">
          <li>
            <span className="text-[var(--tw-accent)]">◆</span>{' '}
            <strong>Zero Point — 21 Dec 2012</strong>: the theoretical terminus; wave value = 0;
            maximum novelty.
          </li>
          <li>
            <span className="text-[var(--tw-accent)]">◆</span>{' '}
            <strong>Apollo 11 — 20 Jul 1969</strong>: first crewed lunar landing.
          </li>
          <li>
            <span className="text-[var(--tw-accent)]">◆</span>{' '}
            <strong>Trinity — 16 Jul 1945</strong>: the first nuclear weapons test.
          </li>
          <li>
            <span className="text-[var(--tw-accent)]">◆</span>{' '}
            <strong>1492 CE</strong>: Columbus&rsquo;s first voyage; European contact with the
            Americas.
          </li>
          <li>
            <span className="text-[var(--tw-accent)]">◆</span>{' '}
            <strong>Year 1 CE</strong>: the conventional start of the Common Era.
          </li>
        </ul>
      </section>

      {/* ── 5. Controls ────────────────────────────────────────────── */}
      <section id="controls">
        <h2 className="text-lg mb-1">5. Controls</h2>

        <h3 className="mb-1 mt-2">Mouse</h3>
        <ul className="list-none ml-2 space-y-1">
          <li>
            <strong>Scroll wheel</strong> — zoom in/out centered on the cursor position.
          </li>
          <li>
            <strong>Click + drag</strong> — pan left or right along the time axis.
          </li>
          <li>
            <strong>Hover</strong> — live readout of the date and wave value (novelty level) at the
            cursor.
          </li>
        </ul>

        <h3 className="mb-1 mt-2">Touch</h3>
        <ul className="list-none ml-2 space-y-1">
          <li>
            <strong>Pinch</strong> — zoom.
          </li>
          <li>
            <strong>Drag</strong> — pan.
          </li>
          <li>
            <strong>Tap</strong> — show readout at that position.
          </li>
        </ul>

        <h3 className="mb-1 mt-2">Keyboard</h3>
        <table className="border-collapse text-sm mt-1">
          <thead>
            <tr>
              <th className="border border-[#163] px-3 py-1 text-left">Key</th>
              <th className="border border-[#163] px-3 py-1 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#163] px-3 py-1">H &nbsp;or&nbsp; ?</td>
              <td className="border border-[#163] px-3 py-1">Open this Help screen</td>
            </tr>
            <tr>
              <td className="border border-[#163] px-3 py-1">A</td>
              <td className="border border-[#163] px-3 py-1">Open the About screen</td>
            </tr>
            <tr>
              <td className="border border-[#163] px-3 py-1">C</td>
              <td className="border border-[#163] px-3 py-1">Return to the Chart</td>
            </tr>
          </tbody>
        </table>

        <h3 className="mb-1 mt-2">Zoom Presets &amp; Navigation</h3>
        <ul className="list-none ml-2 space-y-1">
          <li>
            <strong>[ 1Y ] [ 10Y ] [ 100Y ] [ 1KY ] [ 10KY ]</strong> — preset zoom spans centered
            on the current view.
          </li>
          <li>
            <strong>[ GOTO ]</strong> — enter any date to jump the center of the view to that date.
          </li>
          <li>
            <strong>[ SHARE ]</strong> (bottom-right) — copies a deep link to the current viewport
            to the clipboard. The URL encodes the exact time window, so anyone opening the link sees
            the same view.
          </li>
        </ul>
      </section>

      {/* ── 6. The math ────────────────────────────────────────────── */}
      <section id="math">
        <h2 className="text-lg mb-1">6. The Math</h2>
        <p>
          The timewave is built from the King Wen sequence — the traditional ordering of the 64 I
          Ching hexagrams. A set of 384 numbers (six lines &times; 64 hexagrams) is derived from
          the first-difference transitions between adjacent hexagrams in that sequence. This site
          uses the <strong>Sheliak (TW1) number set</strong>, a mathematically revised version
          published by John Sheliak in 1996 following the &ldquo;Watkins Objection&rdquo;, which
          identified arithmetic inconsistencies in the original Kelley data set. Sheliak&rsquo;s
          revision was reportedly preferred by McKenna himself.
        </p>
        <p>
          The wave is self-similar under scaling by a factor of 64: the shape of the wave over any
          span is reproduced at 1/64 scale within each sub-interval. This fractal self-similarity is
          the structural basis of McKenna&rsquo;s claim that &ldquo;time is fractal.&rdquo; The
          wave is computed as a weighted sum over nested copies of the 384-number set, each scaled
          to the relevant time unit (day, month, year, etc.), summed to produce a single novelty
          value per point in time. See <Link href="/about" className="underline">About</Link> for
          sources and implementation references.
        </p>
      </section>

      <p className="pt-4">
        <Link href="/" className="underline phosphor-glow">[ RETURN TO CHART ]</Link>
      </p>
    </article>
  );
}

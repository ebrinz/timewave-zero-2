import Link from 'next/link';

export function AboutScreen() {
  return (
    <article className="max-w-[80ch] mx-auto p-6 space-y-4 leading-relaxed overflow-y-auto h-full">
      <h1 className="text-xl phosphor-glow">TIMEWAVE ZERO 2 — ABOUT</h1>

      {/* ── 1. Origins ─────────────────────────────────────────────── */}
      <section id="origins">
        <h2 className="text-lg mb-1">1. Origins</h2>
        <p>
          Novelty theory was developed by Terence McKenna and his brother Dennis McKenna and first
          presented in their 1975 book <em>The Invisible Landscape: Mind, Hallucinogens, and the I
          Ching</em>. The theory proposes that time is not uniform but structured — that the universe
          moves through alternating periods of novelty (change, creativity, complexity) and habit
          (entrenchment, repetition), governed by a wave derived from the King Wen sequence of the
          64 I Ching hexagrams.
        </p>
        <p>
          In the 1980s, programmer and philosopher Peter Meyer implemented the theory as a DOS
          application called <em>Timewave Zero</em>, making the wave computable and interactive for
          the first time.{' '}
          <a
            href="https://archive.org/details/twz_20200405"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            An archive of that original DOS program is available at the Internet Archive.
          </a>{' '}
          Meyer&rsquo;s work — including the C source code — remains the primary technical reference
          for the wave function used here.
        </p>
      </section>

      {/* ── 2. The Sheliak variant ─────────────────────────────────── */}
      <section id="sheliak">
        <h2 className="text-lg mb-1">2. The Sheliak (TW1) Variant</h2>
        <p>
          The original data set (sometimes called the &ldquo;Kelley set&rdquo;) was critiqued by
          Mathew Watkins, who identified arithmetic errors in how the 384 numbers were derived from
          the King Wen sequence — an issue that became known as the &ldquo;Watkins Objection.&rdquo;
          In response, physicist John Sheliak produced a mathematically corrected version of the
          data set in 1996, referred to as <strong>TW1</strong> or the Sheliak set. McKenna
          reportedly endorsed Sheliak&rsquo;s revision as the preferred version of the wave.
        </p>
        <p>
          This site uses the <strong>Sheliak (TW1) number set exclusively</strong> — 384 numbers
          derived from the King Wen sequence under Sheliak&rsquo;s corrected methodology. The data
          set and wave function were taken from Peter Meyer&rsquo;s{' '}
          <code>TW_EN.C</code> source code and cross-checked against independent references (see
          the Sources section below).
        </p>
      </section>

      {/* ── 3. Honesty ─────────────────────────────────────────────── */}
      <section id="honesty">
        <h2 className="text-lg mb-1">3. Honesty</h2>
        <p>
          Novelty theory has no empirical basis in physics, history, or any other established
          discipline. The correspondences McKenna identified between wave features and historical
          events are post-hoc pattern matches — the kind of connections that human pattern-recognition
          produces readily when given a wiggly curve and thousands of years of history to draw from.
        </p>
        <p>
          This site is an <strong>art piece and an interactive model of a mathematical curiosity</strong>.
          It is intended as a respectful, honest recreation of a culturally significant piece of
          psychedelic-era thinking, not as a tool for prediction, planning, or any consequential
          decision-making. Do not use it to forecast events.
        </p>
      </section>

      {/* ── 4. Credits ─────────────────────────────────────────────── */}
      <section id="credits">
        <h2 className="text-lg mb-1">4. Credits</h2>
        <ul className="list-none ml-2 space-y-1">
          <li>
            <strong>Terence McKenna</strong> — originator of novelty theory and the timewave concept.
          </li>
          <li>
            <strong>Dennis McKenna</strong> — co-author of <em>The Invisible Landscape</em> (1975).
          </li>
          <li>
            <strong>Peter Meyer</strong> — implemented the original Timewave Zero DOS program and
            published the C source code and data sets.
          </li>
          <li>
            <strong>John Sheliak</strong> — produced the TW1 (Sheliak) corrected number set (1996).
          </li>
          <li>
            <strong>Timewave Zero 2</strong> — this reboot: a modern, open-source, static-web
            recreation of the original DOS program, built with Next.js, React, and Tailwind CSS.
          </li>
        </ul>
      </section>

      {/* ── 5. Sources ─────────────────────────────────────────────── */}
      <section id="sources">
        <h2 className="text-lg mb-1">5. Sources</h2>
        <ul className="list-none ml-2 space-y-2">
          <li>
            <a
              href="https://archive.org/details/twz_20200405"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Original Timewave Zero DOS program archive (Internet Archive, 2020 snapshot)
            </a>{' '}
            — includes Peter Meyer&rsquo;s executables and documentation.
          </li>
          <li>
            <a
              href="https://www.fractal-timewave.com/"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              fractal-timewave.com — Peter Meyer&rsquo;s Timewave Zero site
            </a>{' '}
            — the primary reference for the wave function, the Sheliak TW1 data set, and the
            mathematics of the self-similar fractal sum.
          </li>
          <li>
            <strong>TW_EN.C (Peter Meyer)</strong> — the C source implementation of the timewave
            function. The 384-number Sheliak set and wave algorithm used in this project were taken
            from this source and cross-checked against the reference implementation. See{' '}
            <code>src/chart/references/sheliak-algorithm.md</code> in this repository for details.
          </li>
          <li>
            McKenna, T. &amp; McKenna, D. (1975).{' '}
            <em>The Invisible Landscape: Mind, Hallucinogens, and the I Ching</em>.
          </li>
        </ul>
      </section>

      <p className="pt-4">
        <Link href="/" className="underline phosphor-glow">[ RETURN TO CHART ]</Link>
      </p>
    </article>
  );
}

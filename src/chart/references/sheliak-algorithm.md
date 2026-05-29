# Sheliak Timewave (TW1) — Algorithm Reference

**Task 4 research deliverable. Retrieval date: 2026-05-28.**

This document records what was *verified from primary sources* about the Sheliak
variant of Terence McKenna / Peter Meyer's "Timewave Zero". Where something could
not be fully verified it is flagged explicitly. No numbers in this document are
guessed.

## Sources (primary + cross-check)

1. **Peter Meyer's original DOS Timewave Zero program, 2020 archive.**
   <https://archive.org/details/twz_20200405> — `twz.zip`. Contains:
   - `TW_EN.C` — Peter Meyer's own C source for the wave-value function
     (header: `by Peter Meyer / last revision: 1993-03-09`). This is the
     authoritative generation algorithm.
   - `DATA.TWZ` and `ORIGDATA.TWZ` — the active 384-number data set this build
     ships with (they are byte-identical to each other and to the Sheliak set;
     see cross-check below).
   - `VERSIONS.TXT`, `readme.txt`, `TWZ.CFG` (`DATAFILE=DATA.TWZ`).
2. **`jasondrawdy/Omniwave`** (MIT-licensed C# reimplementation that bundles all
   four canonical data files). <https://github.com/jasondrawdy/Omniwave>
   - `Omnigen/Generators/WaveGenerator.cs` — re-implements Meyer's algorithm and
     defines `enum WaveType { Kelley = 1, Watkins = 2, Sheliak = 3, HuangTi = 4 }`.
   - `Omnigen/Resources/Data/DATA.TW1..TW4` — the four 384-number sets.
   - `Omnigen/Properties/Resources.resx` maps the resource names to files:
     `DATA→DATA.TW3` (Kelley, idx 0), `DATA1→DATA.TW4` (Watkins, idx 1),
     `DATA2→DATA.TW1` (**Sheliak**, idx 2), `DATA3→DATA.TW2` (HuangTi, idx 3).
     So **the Sheliak set is the file `DATA.TW1`** — consistent with the well-known
     fact that Sheliak's revised set is the "TW1" set.
3. Supporting (secondary) context: Peter Meyer's <https://www.fractal-timewave.com/>
   ("The Mathematics of the Timewave", `articles/math_twz.htm`;
   "Derivation…", `articles/derivation_10.htm`; "The Four Number Sets",
   `articles/four_number_sets.htm`) and the LEVITY mirror of John Sheliak's
   formalization. The detailed Meyer math pages are scanned images / partly
   pay-walled, so the *exact algorithm and numbers come from the source code and
   data files above*, not from those prose pages.

## Cross-check result: PASSED

The Sheliak 384-number set was obtained from two fully independent artifacts and
compared element-by-element:

- Omniwave `DATA.TW1` (resource-mapped to `WaveType.Sheliak`)
- DOS TWZ program `DATA.TWZ` (this 2020 build's active default set)

`diff` of the two normalized integer streams reports **IDENTICAL** — all 384
values match exactly. `DATA.TWZ` and `ORIGDATA.TWZ` in the archive are also
identical to each other. Both sets contain exactly **384** integers. This is a
strong, byte-level confirmation.

As an additional consistency check, the Kelley set (Omniwave `DATA.TW3`) begins
`0, 0, 0, 1, 4, 3, 2, 2, 4, 4, …`, which matches the long-published Kelley data,
confirming the resource→file→variant mapping is correct.

---

## 1. King Wen sequence and hexagram encoding

The 64 I Ching hexagrams in **King Wen order** are the conceptual seed. Each
hexagram is six stacked lines, each yang (solid) or yin (broken). We encode a
hexagram as a 6-bit integer with **bit 0 = bottom line, yang = 1, yin = 0**
(so hexagram 1 ䷀ = `111111` = 63, hexagram 2 ䷁ = `000000` = 0).

The King Wen sequence under this encoding (verified against standard I Ching
binary tables) is exported as `KING_WEN_REFERENCE` in the fixture. The 64
hexagrams form 32 pairs; each pair is related by inversion (turning the hexagram
upside-down, 28 pairs) or complement (flipping every line, 4 pairs).

> Important scope note: the running Timewave program does **not** recompute the
> King Wen difference at runtime. It reads the pre-built 384-number data set
> directly (`read_data_points()` in `TW_EN.C`). The King Wen → 384-number
> construction (Section 2) is the *derivation* of that data set, recorded here
> for completeness; the wave math (Section 4) consumes the 384-number set.

## 2. Construction of the 384-number set (King Wen → data set)

From Meyer's "Derivation of the Timewave from the King Wen Sequence"
(`derivation_10.htm`) and the four-number-sets history:

1. Take the **first order of difference** of the King Wen sequence: for each
   adjacent pair of hexagrams, count how many lines change (Hamming distance of
   the 6-bit codes), wrapping 64→1. Within a King Wen pair this count is always
   even; odd values occur only at transitions between pairs.
2. The sequence is **closed** by taking the resulting graph, rotating it 180°,
   and superimposing it on itself ("closure at four adjacent points"). This
   bidirectional / "half-twist" arrangement is what makes the set valid in both
   time directions.
3. The result is expanded to **384 = 6 × 64** values (one per *yao*/line of the
   64 hexagrams). 384 is the published, and here byte-verified, cardinality.

**Variants and the Watkins Objection.** The original set is **Kelley** (appendix
to the 1975 *Invisible Landscape*). In 1994 Peter Meyer / Matthew Watkins found
an inconsistency between McKenna's prose description of the construction and what
the program actually did; correcting it yields the **Watkins** set. **John
Sheliak** (announced Nov 1997) re-derived the construction with a single explicit
vector/linear-interpolation formula; the half-twist is applied as
`L(x) = F(x) + 3·F(1 + (x−1)/3) + 6·F(1 + (x−1)/6)`, where `F` is the piecewise-
linear interpolation of `F(i) = 9 − D_W(−1−i) − D_W(i)`. This produced the
**Sheliak** set (the "TW1" set), which is the one this project uses and which
McKenna reportedly preferred. **Huang Ti** ("Huygens") is a fourth, unrelated set
that emerged by 1998. We did **not** independently re-derive the Sheliak numbers
from this formula; we verified the *set itself* by the byte-level cross-check
above (the more reliable evidence).

## 3. Cardinality: 384 (confirmed)

Every one of the four data files (`DATA.TW1..TW4`) and the DOS `DATA.TWZ` contains
**exactly 384 non-negative integers**. Not 64. The 64 hexagrams expand to
6 × 64 = 384 yao.

## 4. Computing a wave value at a given time

This is the load-bearing part, taken verbatim from Peter Meyer's `TW_EN.C`.

Let `w[0..383]` be the data set and `wave_factor = 64`. Define `powers[i] = 64^i`.

**Interpolation into the data set** (`v`): for a real position `y`,
```
i = (int) fmod(y, 384)      // index, magnitude of y mod 384
j = (i + 1) % 384
z = y - floor(y)            // fractional part
v(y) = (z == 0) ? w[i] : (w[j] - w[i]) * z + w[i]   // linear interpolation
```

**Wave value** `f(x)` where `x = number of days before the zero point` (x ≥ 0):
```
sum = 0
if (x != 0) {
    // (A) "zoom-out" / large scales: i = 0,1,2,...  while 64^i <= x
    for (i = 0; x >= powers[i]; i++)
        sum += powers[i] * v( x / powers[i] );

    // (B) "zoom-in" / fractal small scales: i = 1,2,3,... until convergence
    i = 0;
    do {
        if (++i > CALC_PREC + 2) break;          // CALC_PREC = 10
        sum += v( x * powers[i] ) / powers[i];
    } while (sum < powers[CALC_PREC - i + 2]);   // convergence/precision test
}
return sum / powers[3];     // divide by 64^3, matches the Apple // version & nicer axis labels
```

### Scale weighting — and the verdict on `1/1.7^scale`

The contribution of scale `i` is weighted by **`64^i`** (term A, large scales) or
**`1/64^i`** (term B, fractal infill), where 64 is the `wave_factor`. The function
is *self-similar under scaling by 64*: zooming the time axis by a factor of 64
reproduces the wave shape, which is McKenna's central fractal claim.

**There is NO `1/1.7^scale` damping factor anywhere in the real algorithm.** The
prototype's `v += interp / Math.pow(1.7, s)` in `test1.jsx` is **fabricated /
incorrect** and must be removed. The genuine per-scale weight is the geometric
factor `64^i` (equivalently `1/64^i` on the fractal side) that is intrinsic to the
self-similar sum — it is not an arbitrary tunable. Also note the prototype's other
deviations from the real algorithm:
- it uses a 64-element first-order-difference array, not the 384-number Sheliak set;
- it interpolates `phase = (a mod 64^(s+1))/64^(s+1) * 64` per scale rather than the
  `v(x/64^i)` / `v(x·64^i)` construction above;
- it has no `/64^3` normalization and no convergence test.

Task 5 should implement Section 4 faithfully and discard the prototype's wave math.

### Implementation note (portability)

`TW_EN.C` speeds up multiply/divide-by-`64^i` by directly adding/subtracting
`i*0x60` to the IEEE-754 exponent bytes (`mult_power`/`div_power`). This is an
optimization that is *mathematically identical* to `x * 64^i` / `x / 64^i`; a
portable implementation should just multiply/divide. (Verified: a portable C
re-build using `x*powers[i]` reproduces the expected self-consistent values such
as `f(24576) = 0.046875 = 3/64`.)

## 5. Novelty / habit convention and normalization

- The wave value `f(x)` is **non-negative**. **Low value = high novelty; high
  value = habit** (entrenchment, "routine").
- The **zero point** (the singularity / eschaton) is the unique point where the
  wave value is **0** — i.e. maximum novelty. In the formula, `f(0) = 0` (the
  `if (x != 0)` guard leaves `sum = 0`).
- The program plots "days to the zero date" on the x-axis; the wave is *not* a
  symmetric absolute-value-of-distance function (contrary to the prototype's
  `novelty(t) = |raw - raw0| / raw0`). The raw `f` value *is* the novelty/habit
  measure directly, with smaller = more novel. Any UI normalization (e.g.
  scaling to a 0..1 band for drawing) is a presentation choice, not part of the
  theory; the y-axis in the DOS program is just `f` after the `/64^3` scaling.

## 6. Zero date and anchor-independence

- Standard zero date: **2012-12-21** (McKenna's value; specifically ~06:00
  Colombian time on the winter solstice; earlier materials used 2012-12-22).
- The wave **shape is independent of the chosen anchor date**. The mathematics is
  defined purely in terms of `x = days to the zero point`; choosing a calendar
  zero date only fixes the mapping `calendar date ↔ x`. Changing the anchor slides
  the whole wave along the time axis without altering its shape. (The original
  anchor was derived by treating 1945-08-06 as a maximal-novelty event and going
  forward one 67.29-year / 24,576-day cycle; that heuristic only sets the anchor,
  not the shape.)

## Reference sample values (for spot-checking Task 5)

Generated by compiling Peter Meyer's `TW_EN.C` (portable multiply/divide variant)
against the verified Sheliak `DATA.TWZ`. `x` = days before zero point.

| x (days)   | f(x)               |
|------------|--------------------|
| 1          | 0.00000361601512   |
| 2          | 0.00000290643601   |
| 7          | 0.00001124540965   |
| 67         | 0.00016383330027   |
| 365.25     | 0.00094825029373   |
| 2349       | 0.00579667091370   |
| 4096       | 0.01481119791667   |
| 24576      | 0.04687500000000   |
| 67449      | 0.23081421852112   |
| 262144     | 0.94791666666667   |
| 1000000    | 6.78441111246745   |
| 5125730    | 18.76276688348679  |

These are exported as `REFERENCE_SAMPLES` in the fixture. Note `f(24576) =
0.046875 = 3/64` and `f(262144) = f(4·64^3) = 0.9479166…`, which are clean
self-consistency anchors a correct reimplementation must hit.

## Honest gaps

- The Meyer prose math pages (`math_twz.htm`, full `derivation_10.htm`) are
  scanned images / partly behind a USB-purchase wall, so Section 2's prose detail
  (exact half-twist book-keeping, Sheliak's `L(x)`) is summarized from secondary
  text, **not** independently recomputed. This does not affect the data we use:
  the 384-number Sheliak set and the wave function are taken from source code and
  data files and are byte/algorithm verified.
- We did not run the original DOS `.EXE` to capture its on-screen y-values; the
  reference samples come from compiling Meyer's own `TW_EN.C`. They should match
  the DOS program because it is the same source.

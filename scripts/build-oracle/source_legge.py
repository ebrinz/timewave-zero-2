"""Source the public-domain James Legge I Ching (Judgment + 6 line texts per
hexagram) and write scripts/build-oracle/hexagrams_source.json.

Each entry: { n, name, judgment, lines[6], keywords[] }.
- judgment + lines: parsed from Legge's translation (1882/1899, public domain),
  fetched from The Gold Scales single-page edition (oaks.nvg.org, HTTP).
- name: the common English hexagram name (kept from the prior source for the UI).
- keywords: curated imagery = the two trigram images (from the King Wen 6-bit code)
  plus the name's content words — strong seed terms for the oracle's word cloud.

Run: python3 source_legge.py   (writes hexagrams_source.json in this directory)
"""
import json
import re
import sys
import urllib.request
from html import unescape
from pathlib import Path

SOURCE_URL = "http://oaks.nvg.org/changes-legge.html"
HERE = Path(__file__).resolve().parent

# King Wen sequence as 6-bit codes (bit0 = bottom line, yang = 1), from
# src/chart/__fixtures__/sheliak-reference.ts (KING_WEN_REFERENCE).
KING_WEN = [
    63, 0, 17, 34, 23, 58, 2, 16, 55, 59, 7, 56, 61, 47, 4, 8,
    25, 38, 3, 48, 41, 37, 32, 1, 57, 39, 33, 30, 18, 45, 28, 14,
    60, 15, 40, 5, 53, 43, 20, 10, 35, 49, 31, 62, 24, 6, 26, 22,
    29, 46, 9, 36, 52, 11, 13, 44, 54, 27, 50, 19, 51, 12, 21, 42,
]
# 3-bit trigram value (bit0 bottom, yang=1) -> image word.
TRIGRAM = {0: "earth", 7: "heaven", 1: "thunder", 2: "water",
           4: "mountain", 6: "wind", 5: "fire", 3: "lake"}
_WORD = re.compile(r"[a-z]+")
# Each yao opens with an ordinal ("(In) the first/second/.../topmost six|nine ...").
# This is more reliable than the numeric "N." markers, which are occasionally
# mistyped ("3-") or dropped entirely in the source text.
_ORD = {"first": 1, "second": 2, "third": 3, "fourth": 4, "fifth": 5, "sixth": 6, "topmost": 6}
_LINE = re.compile(
    r"(?i)\b(?:in\s+)?the\s+(first|second|third|fourth|fifth|sixth|topmost)\s+"
    r"(?:\([^)]*\)\s+)?(?:six|nine)\b",
)


def fetch_html() -> str:
    cached = HERE / "legge.html"
    if cached.exists():
        return cached.read_text(encoding="utf-8", errors="replace")
    with urllib.request.urlopen(SOURCE_URL, timeout=60) as r:  # noqa: S310 — public HTTP source
        return r.read().decode("utf-8", errors="replace")


def parse_section(body: str) -> tuple[str, list[str]]:
    body = body.split("</h1>", 1)[1] if "</h1>" in body else body   # drop the "N. Name" title
    body = re.sub(r"<h3>.*?</h[23]>", " ", body, flags=re.S)         # drop the pinyin header
    txt = unescape(re.sub(r"<[^>]+>", " ", body))
    txt = re.sub(r"[☰-☷]", " ", txt)                      # drop trigram glyphs ☰..☷
    txt = re.sub(r"\[[^\]]*\]", " ", txt)                           # drop editorial [..] notes
    txt = re.sub(r"\s+", " ", txt).strip()
    # strip the leading numeric line marker right before an ordinal opening ("1. The
    # first ..."), so it doesn't cling to the line text.
    matches = list(_LINE.finditer(txt))
    judgment = (txt[: matches[0].start()] if matches else txt).strip()
    judgment = re.sub(r"(?:(?<!\d)[1-7][.\-]\s*)+$", "", judgment).strip()
    lines = ["", "", "", "", "", ""]
    for i, mt in enumerate(matches):
        num = _ORD[mt.group(1).lower()]
        end = matches[i + 1].start() if i + 1 < len(matches) else len(txt)
        seg = re.sub(r"^(?:[1-7][.\-]\s*)+", "", txt[mt.start():end].strip()).strip()
        lines[num - 1] = seg  # last occurrence wins (e.g. "topmost" overriding "sixth")
    return judgment, lines


def keywords_for(n: int, name: str) -> list[str]:
    code = KING_WEN[n - 1]
    trig = [TRIGRAM[(code >> 3) & 7], TRIGRAM[code & 7]]
    name_words = _WORD.findall(name.lower())
    return list(dict.fromkeys(trig + name_words))


def main() -> None:
    existing = {h["n"]: h for h in json.loads((HERE / "hexagrams_source.json").read_text())}
    raw = fetch_html()
    parts = re.split(r'<h1><a name="(\d+)">', raw)
    sections = {int(parts[i]): parts[i + 1]
                for i in range(1, len(parts) - 1, 2)
                if parts[i].isdigit() and 1 <= int(parts[i]) <= 64}
    if len(sections) != 64:
        sys.exit(f"expected 64 hexagram sections, found {len(sections)}")

    out = []
    for n in range(1, 65):
        judgment, lines = parse_section(sections[n])
        name = existing[n]["name"]
        # Preserve curated imagery keywords across re-sourcing; fall back to the
        # trigram+name derivation only when none are present yet.
        kw = existing[n].get("keywords") or keywords_for(n, name)
        out.append({"n": n, "name": name, "judgment": judgment, "lines": lines, "keywords": kw})

    missing = [(h["n"], bool(h["judgment"]), sum(1 for x in h["lines"] if x)) for h in out
               if not h["judgment"] or not all(h["lines"])]
    (HERE / "hexagrams_source.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    print(f"wrote 64 hexagrams; incomplete (n, hasJudg, lines): {missing}", file=sys.stderr)


if __name__ == "__main__":
    main()

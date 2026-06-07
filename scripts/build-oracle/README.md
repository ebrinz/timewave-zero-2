# build-oracle — Subproject C data pipeline

Offline: raw GloVe + `hexagrams_source.json` + B's `events.json` →
`public/data/{hexagrams.json, hexagrams_64.bin, glove_q.bin}`. Output committed; CI never runs it.

## Run
    # one-time: download glove.6B.zip, unzip glove.6B.300d.txt
    GLOVE_TXT=/path/to/glove.6B.300d.txt python3 build_oracle.py

## Tests
    python3 -m pytest -q

## Provenance
- Hexagram text (`hexagrams_source.json`): **original concise descriptions** of the
  64 hexagrams, grounded in the standard hexagram names and the traditional trigram
  imagery (heaven, earth, thunder, water, mountain, wind, fire, lake). These are
  original paraphrases written for this project — NOT verbatim from any copyrighted
  translation. (The plan originally proposed Legge 1899; clean structured Legge text
  was not reliably sourceable, and the well-structured public datasets are
  Wilhelm/Baynes, whose English is not actually public domain. Original paraphrase
  avoids both the copyright risk and brittle scraping, and yields richer seed words.)
- Word vectors: GloVe 6B 300d (Apache 2.0); the raw file is never shipped — only the
  trimmed int8 `glove_q.bin` (~2 MB) is committed.
- Hexagram centroids live in the same GloVe space as B's `events.bin`, so resonance
  (cosine) between a hexagram and past events is meaningful.

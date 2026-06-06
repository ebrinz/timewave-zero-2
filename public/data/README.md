# public/data — subproject B output (live)

- `events.json` — historical events for the timeline. Top-level `wave_variant`
  MUST equal the app's `WAVE_VARIANT` (`sheliak-tw1`). The app fetches
  `${NEXT_PUBLIC_BASE_PATH}/data/events.json` on mount; absent file → renders nothing.
- `events.bin` — per-event GloVe centroid vectors (engine bin format) for
  subproject C. Not fetched at runtime in B.

Regenerate with `scripts/build-events/` (see its README). See `src/chart/EXTENSION-POINTS.md`.

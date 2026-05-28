# Reserved for subproject B (Wikipedia event index)

Subproject B writes `events.json` here. Contract:
- Top-level field `wave_variant` MUST equal the app's `WAVE_VARIANT` (`sheliak-tw1`).
- The app fetches `${NEXT_PUBLIC_BASE_PATH}/data/events.json` at mount and renders nothing if the file is absent (404 is expected until B ships).
See `src/chart/EXTENSION-POINTS.md`.

# OG Card Images

The Open Graph card image (`chart.png`) is generated separately and added to this directory before deployment.

It is referenced in the site metadata as `/og/chart.png` (relative to `metadataBase`), which resolves to the full deploy URL at build time via `NEXT_PUBLIC_SITE_URL`.

The file is intentionally not checked into the repository — add `chart.png` here before running `npm run build` for production deploys.

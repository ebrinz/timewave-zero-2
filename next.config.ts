import type { NextConfig } from 'next';
import path from 'node:path';

// basePath strategy:
//   `next dev`   runs with NODE_ENV=development  -> no prefix, so the local dev
//                server works at http://localhost:3000/.
//   `next build` ALWAYS runs with NODE_ENV=production (Next forces this), and a
//                static export is only ever produced for deployment, so every
//                build is prefixed for the GitHub Pages subpath. Keying off
//                NODE_ENV is therefore the correct dev-server-vs-build switch.
//   Custom domain / root deploy: set NEXT_PUBLIC_BASE_PATH="" in the build env;
//                an explicitly empty string disables the prefix.
const isDevServer = process.env.NODE_ENV !== 'production';
const basePath = isDevServer ? '' : (process.env.NEXT_PUBLIC_BASE_PATH ?? '/timewave-zero-2');

const nextConfig: NextConfig = {
  output: 'export',
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  // Exposed to client code (e.g. raw fetch() of /data/events.json), which Next
  // does NOT auto-prefix the way it prefixes next/link and next/image.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;

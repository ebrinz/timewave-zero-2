import type { NextConfig } from 'next';
import path from 'node:path';

const isProd = process.env.NODE_ENV === 'production';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/timewave-zero-2';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: isProd ? basePath : '',
  assetPrefix: isProd ? basePath : '',
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: isProd ? basePath : '' },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;

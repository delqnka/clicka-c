/** @type {import('next').NextConfig} */
function hostnameFromUrl(maybeUrl) {
  try {
    return new URL(maybeUrl).hostname;
  } catch {
    return '';
  }
}

const r2PublicRaw =
  process.env.R2_PUBLIC_URL ?? process.env.CLOUDFLARE_R2_PUBLIC_URL ?? '';
const r2PublicNormalized = r2PublicRaw.trim().startsWith('http')
  ? r2PublicRaw.trim().replace(/\/$/, '')
  : r2PublicRaw.trim()
    ? `https://${r2PublicRaw.trim().replace(/\/$/, '')}`
    : '';
const r2Host = hostnameFromUrl(r2PublicNormalized);

const nextConfig = {
  env: {
    NEXT_PUBLIC_R2_PUBLIC_URL: r2PublicNormalized,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-accordion'],
    optimizeCss: true,
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  /** browserslist targets Chrome/Safari 111+ — skip next-polyfill-module (~12 KiB). */
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      '../build/polyfills/polyfill-module': false,
      'next/dist/build/polyfills/polyfill-module': false,
    };
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 640],
    remotePatterns: [
      ...(r2Host
        ? [
            {
              protocol: 'https',
              hostname: r2Host,
              port: '',
              pathname: '/**',
            },
          ]
        : []),
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-afdca1718c964f3183e7aa0553082c2f.r2.dev',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;

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
  images: {
    formats: ['image/avif', 'image/webp'],
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
    ],
  },
};

module.exports = nextConfig;

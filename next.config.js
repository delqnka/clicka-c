// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

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

/** @type {import('next').NextConfig['headers']} */
const baseCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://js.stripe.com https://browser.sentry-cdn.com https://www.clarity.ms https://scripts.clarity.ms https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' blob: data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "frame-src https://challenges.cloudflare.com https://js.stripe.com https://www.facebook.com https://www.openstreetmap.org",
  // Sentry ingest endpoints are wildcarded so any project (Clicka.bg or a
  // rebranded engine deploy) can report to its own Sentry without us editing CSP.
  "connect-src 'self' https://openrouter.ai https://api.stripe.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io https://sentry.io https://*.clarity.ms https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://www.facebook.com https://connect.facebook.net https://capig.datah04.com",
  "worker-src 'self' blob:",
];

const securityHeaders = [
  { key: 'X-Content-Type-Options',           value: 'nosniff' },
  { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',              value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security',       value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control',          value: 'on' },
  {
    key: 'Content-Security-Policy',
    value: [...baseCsp, "frame-ancestors 'none'"].join('; '),
  },
];

// Stricter headers for platform admin / billing / api routes.
const adminSecurityHeaders = [
  { key: 'X-Content-Type-Options',           value: 'nosniff' },
  { key: 'X-Frame-Options',                 value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',              value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security',       value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control',          value: 'on' },
  {
    key: 'Content-Security-Policy',
    value: [...baseCsp, "frame-ancestors 'self'"].join('; '),
  },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      // Stricter set for platform routes (admin, billing, api, setup, account).
      { source: '/admin/:path*',   headers: adminSecurityHeaders },
      { source: '/billing/:path*', headers: adminSecurityHeaders },
      { source: '/api/:path*',     headers: adminSecurityHeaders },
      { source: '/setup/:path*',   headers: adminSecurityHeaders },
      { source: '/account/:path*', headers: adminSecurityHeaders },
      // Everything else should not be embedded. Custom client sites use /api/public
      // and the drop-in widget instead of iframeing engine pages.
      { source: '/(.*)',           headers: securityHeaders },
    ];
  },
  env: {
    NEXT_PUBLIC_R2_PUBLIC_URL: r2PublicNormalized,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-accordion'],
    optimizeCss: true,
    instrumentationHook: true,
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

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Source maps качени в Sentry, скрити от browser
  silent: true,
  hideSourceMaps: true,

  // Намалява bundle size — не включва Sentry debug код в prod
  disableLogger: true,

  // Automatic instrumentation на Next.js API routes
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: false,
  autoInstrumentAppDirectory: true,
});

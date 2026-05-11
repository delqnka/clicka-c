/** @type {import('next').NextConfig} */
function hostnameFromUrl(maybeUrl) {
  try {
    return new URL(maybeUrl).hostname;
  } catch {
    return '';
  }
}

const r2Host = hostnameFromUrl(process.env.R2_PUBLIC_URL ?? '');

const nextConfig = {
  images: {
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

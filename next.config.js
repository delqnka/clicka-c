/** @type {import('next').NextConfig} */
function hostnameFromUrl(maybeUrl) {
  try {
    return new URL(maybeUrl).hostname;
  } catch {
    return '';
  }
}

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Must be hostname only; env is typically a full URL.
        hostname: hostnameFromUrl(process.env.R2_PUBLIC_URL ?? ''),
        port: '',
        pathname: '/**',
      },
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

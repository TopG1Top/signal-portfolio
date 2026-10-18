import type { NextConfig } from 'next';
const config: NextConfig = {
  distDir: process.env.VERCEL
    ? '.next'
    : process.env.SIGNAL_BUILD === 'portfolio'
      ? '.next-portfolio'
      : process.env.SIGNAL_BUILD === 'portfolio-dev'
        ? '.next-portfolio-dev'
        : process.env.SIGNAL_BUILD === '1'
          ? '.next-production'
          : '.next',
  serverExternalPackages: ['pg', 'bullmq', 'ioredis', 'nodemailer'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.basemaps.cartocdn.com; connect-src 'self' https://*.basemaps.cartocdn.com https://demotiles.maplibre.org; worker-src 'self' blob:; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default config;

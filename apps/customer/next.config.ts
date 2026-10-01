import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@laundelle/ui',
    '@laundelle/types',
    '@laundelle/api-client',
    '@laundelle/auth',
    '@laundelle/utils',
    '@laundelle/validations',
    '@laundelle/config',
    '@laundelle/ids',
  ],
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

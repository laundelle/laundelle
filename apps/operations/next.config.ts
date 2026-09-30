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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;

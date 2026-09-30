import type { NextConfig } from 'next';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://customer.laundelle.co.uk',
  'https://ops.laundelle.co.uk',
  'https://admin.laundelle.co.uk',
  'https://laundelle.co.uk',
  'https://www.laundelle.co.uk',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];
  const appUrls = [
    process.env.APP_URL,
    process.env.ADMIN_URL,
    process.env.OPERATIONS_URL,
    process.env.CUSTOMER_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins, ...appUrls]));
}

const nextConfig: NextConfig = {
  transpilePackages: [
    '@laundelle/types',
    '@laundelle/config',
    '@laundelle/utils',
    '@laundelle/validations',
    '@laundelle/ids',
  ],
  async headers() {
    const origins = getAllowedOrigins();

    const originSpecificHeaders = origins.map((origin) => ({
      source: '/api/:path*',
      has: [
        {
          type: 'header' as const,
          key: 'origin',
          value: origin,
        },
      ],
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
      ],
    }));

    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Requested-With, laundelle_token, l2u_token' },
          { key: 'Access-Control-Max-Age', value: '86400' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
      ...originSpecificHeaders,
    ];
  },
};

export default nextConfig;

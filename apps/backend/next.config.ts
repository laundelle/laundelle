import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@laundelle/types',
    '@laundelle/config',
    '@laundelle/utils',
    '@laundelle/validations',
    '@laundelle/ids',
  ],
};

export default nextConfig;

import { NextRequest, NextResponse } from 'next/server';


const PRODUCTION_ALLOWED_ORIGINS = [
  'https://customer.laundelle.co.uk',
  'https://ops.laundelle.co.uk',
  'https://admin.laundelle.co.uk',
  'https://laundelle.co.uk',
  'https://www.laundelle.co.uk',
];

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:4000',
];

export function getAllowedOrigins(): string[] {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOrigins = isProd
    ? [...PRODUCTION_ALLOWED_ORIGINS]
    : [...PRODUCTION_ALLOWED_ORIGINS, ...DEV_ALLOWED_ORIGINS];

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

  const appUrls = [
    process.env.APP_URL,
    process.env.ADMIN_URL,
    process.env.OPERATIONS_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  const combined = [...baseOrigins, ...envOrigins, ...appUrls];
  const normalizedOrigins: string[] = [];

  for (const raw of combined) {
    try {
      const parsed = new URL(raw);
      normalizedOrigins.push(parsed.origin.toLowerCase());
    } catch {
      // Ignore malformed environment values safely
    }
  }

  return Array.from(new Set(normalizedOrigins));
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin || typeof origin !== 'string') return false;

  let normalizedIncoming: string;
  try {
    const parsed = new URL(origin.trim());
    // Only accept http and https schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    normalizedIncoming = parsed.origin.toLowerCase();
  } catch {
    // Malformed origin
    return false;
  }

  const isProd = process.env.NODE_ENV === 'production';

  // In non-production only, allow local development loopback ports
  if (!isProd) {
    if (
      normalizedIncoming.startsWith('http://localhost:') ||
      normalizedIncoming.startsWith('http://127.0.0.1:')
    ) {
      return true;
    }
  }

  // Production: strictly exact match against configured and normalized allowlist
  const allowed = getAllowedOrigins();
  return allowed.includes(normalizedIncoming);
}

export function getCorsHeaders(req?: NextRequest): Record<string, string> {
  const origin = req?.headers.get('origin');
  const allowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, x-csrf-token, laundelle_token, l2u_token',
    'Vary': 'Origin',
  };

  if (origin && allowed) {
    let cleanOrigin = origin;
    try {
      cleanOrigin = new URL(origin).origin;
    } catch {
      // Fallback
    }
    headers['Access-Control-Allow-Origin'] = cleanOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token, x-csrf-token, laundelle_token, l2u_token',
  'Vary': 'Origin',
};

export function handleOptions(req?: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}


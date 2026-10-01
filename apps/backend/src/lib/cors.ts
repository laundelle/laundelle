import { NextRequest, NextResponse } from 'next/server';

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
  'https://pqd8t2s4-3000.inc1.devtunnels.ms',
  'https://pqd8t2s4-3001.inc1.devtunnels.ms',
  'https://pqd8t2s4-3002.inc1.devtunnels.ms',
  'https://pqd8t2s4-4000.inc1.devtunnels.ms',
];

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];
  const appUrls = [
    process.env.APP_URL,
    process.env.ADMIN_URL,
    process.env.OPERATIONS_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean) as string[];

  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins, ...appUrls]));
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (process.env.NODE_ENV !== 'production') return true;

  if (
    origin.includes('.ngrok-free.app') ||
    origin.includes('.ngrok.io') ||
    origin.includes('.github.dev') ||
    origin.includes('.devtunnels.ms')
  ) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

export function getCorsHeaders(req?: NextRequest): Record<string, string> {
  const origin = req?.headers.get('origin');
  const allowed = isOriginAllowed(origin);

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, laundelle_token, l2u_token',
    'Vary': 'Origin',
  };

  if (origin && allowed) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, laundelle_token, l2u_token',
  'Vary': 'Origin',
};

export function handleOptions(req?: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}


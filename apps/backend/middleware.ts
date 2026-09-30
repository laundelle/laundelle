import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, getCorsHeaders } from '@/lib/cors';

export function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return handleOptions(req);
  }

  const res = NextResponse.next();
  const headers = getCorsHeaders(req);
  Object.entries(headers).forEach(([key, value]) => {
    res.headers.set(key, value);
  });

  // Standard Production Security Headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  return res;
}

export const config = {
  matcher: '/api/:path*',
};

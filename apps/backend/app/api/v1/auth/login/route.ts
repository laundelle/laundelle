import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';

async function loginHandler(req: NextRequest) {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    const result = await AuthService.login(body, clientIp);
    return successResponse(result);
}

export const POST = withErrorHandler(loginHandler);

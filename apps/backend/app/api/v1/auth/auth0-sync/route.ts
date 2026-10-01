import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';

async function auth0SyncHandler(req: NextRequest) {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    const result = await AuthService.syncAuth0User(body, clientIp);
    return successResponse(result);
}

export const POST = withErrorHandler(auth0SyncHandler);

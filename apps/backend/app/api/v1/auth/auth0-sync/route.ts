import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, UnauthorizedError } from '@/lib/api';
import { verifyJwtAsync, JwtPayload } from '@/lib/auth';
import { AuthService } from '@/services/AuthService';

async function auth0SyncHandler(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authorization header with Bearer token is required for Auth0 synchronization.');
    }

    const rawToken = authHeader.substring(7).trim();
    const verifiedToken: JwtPayload | null = await verifyJwtAsync(rawToken);

    if (!verifiedToken) {
        throw new UnauthorizedError('Invalid or expired Auth0 identity token.');
    }

    if (verifiedToken.isLegacyToken) {
        throw new UnauthorizedError('Auth0 synchronization requires an authentic Auth0 identity token, not a legacy token.');
    }

    const body = await req.json().catch(() => ({}));
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    const result = await AuthService.syncAuth0User(body, clientIp, verifiedToken);
    return successResponse(result);
}

export const POST = withErrorHandler(auth0SyncHandler);

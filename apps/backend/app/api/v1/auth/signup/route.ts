import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';
import { SessionService } from '@/services/SessionService';

async function signupHandler(req: NextRequest) {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    const result = await AuthService.signUp(body, clientIp);
    const portal = body.portal || 'customer';

    // Create server-side session in MongoDB
    const { sessionId, csrfToken } = await SessionService.createSession({
        userId: (result.user as any).internalId || result.user.id,
        publicId: result.user.publicId || result.user.id,
        email: result.user.email,
        role: result.user.role || 'customer',
        portal,
        userAgent: req.headers.get('user-agent') || 'unknown',
        ipAddress: clientIp,
    });

    (result as any).csrfToken = csrfToken;

    const response = successResponse(result, 201);
    const cookieConfig = SessionService.getCookieConfig(portal);
    response.cookies.set(cookieConfig.name, sessionId, cookieConfig.options);

    return response;
}

export const POST = withErrorHandler(signupHandler);

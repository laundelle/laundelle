import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';
import { verifyJwtAsync } from '@/lib/auth';
import { SessionService } from '@/services/SessionService';

async function logoutHandler(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : null;

    // Revoke bearer token if present
    if (token) {
        try {
            const payload = await verifyJwtAsync(token);
            const userId = payload?.sub;
            await AuthService.logout(token, userId);
            if (userId) {
                await SessionService.revokeAllUserSessions(userId);
            }
        } catch {
            await AuthService.logout(token);
        }
    }

    // Revoke server-side session cookie if present
    const cookieNames = [
        '__Host-laundelle_customer_session',
        '__Host-laundelle_ops_session',
        '__Host-laundelle_admin_session',
        '__Host-laundelle_session',
        'laundelle_customer_session',
        'laundelle_ops_session',
        'laundelle_admin_session',
        'laundelle_session',
        'laundelle_token',
        'l2u_token',
    ];

    for (const name of cookieNames) {
        const val = req.cookies.get(name)?.value;
        if (val) {
            await SessionService.revokeSession(val).catch(() => {});
        }
    }

    const response = successResponse({ success: true, message: 'Logged out and session revoked successfully' });

    // Explicitly delete all authentication cookies
    for (const name of cookieNames) {
        response.cookies.set(name, '', {
            path: '/',
            maxAge: 0,
            expires: new Date(0),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        });
    }

    return response;
}

export const POST = withErrorHandler(logoutHandler);


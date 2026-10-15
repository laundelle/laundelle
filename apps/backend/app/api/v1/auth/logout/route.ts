import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';
import { verifyJwtAsync } from '@/lib/auth';

async function logoutHandler(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : null;

    if (!token) {
        // Idempotent safe response if no token provided
        return successResponse({ success: true, message: 'Logged out successfully' });
    }

    try {
        const payload = await verifyJwtAsync(token);
        const userId = payload?.sub;
        await AuthService.logout(token, userId);
    } catch {
        // Safe revocation fallback
        await AuthService.logout(token);
    }

    return successResponse({ success: true, message: 'Session revoked successfully' });
}

export const POST = withErrorHandler(logoutHandler);

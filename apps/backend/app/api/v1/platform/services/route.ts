import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function getServicesHandler(req: NextRequest) {
    // If request has Authorization header and role is admin, return all services.
    // Otherwise return public services (enabled: true).
    const authHeader = req.headers.get('authorization');
    let isAdmin = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            // Verify token manually without throwing for public endpoint
            const { verifyJwt } = await import('@/lib/auth');
            const token = authHeader.substring(7);
            const user = verifyJwt(token);
            if (user && user.role === 'admin') isAdmin = true;
        } catch (e) {
            // Ignore auth errors for public endpoint, fall back to public data
        }
    }

    if (isAdmin) {
        const services = await PlatformService.getAdminServices();
        return successResponse(services);
    } else {
        const services = await PlatformService.getPublicServices();
        return successResponse(services);
    }
}

async function createServiceHandler(req: NextRequest) {
    const user = requireRole(req, ['admin']);
    const body = await req.json();
    const result = await PlatformService.createService(user.sub, body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getServicesHandler);
export const POST = withErrorHandler(createServiceHandler);

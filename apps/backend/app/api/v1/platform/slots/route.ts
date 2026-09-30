import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function getSlotsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get('postcode') || undefined;
    const plant_id = searchParams.get('plant_id') || undefined;

    const authHeader = req.headers.get('authorization');
    let managerOrAdminUser: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const { verifyJwt } = await import('@/lib/auth');
            const token = authHeader.substring(7);
            const user = verifyJwt(token);
            if (user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'manager')) {
                managerOrAdminUser = user;
            }
        } catch (e) {
            // Ignore for public access
        }
    }

    if (managerOrAdminUser && !postcode) {
        const slots = await PlatformService.getAdminSlots(managerOrAdminUser.sub);
        return successResponse(slots);
    } else {
        const slots = await PlatformService.getPublicSlots({ postcode, plant_id });
        return successResponse(slots);
    }
}

async function createSlotHandler(req: NextRequest) {
    const user = requireRole(req, ['admin', 'super_admin', 'manager']);
    const body = await req.json();
    const result = await PlatformService.createSlot(user.sub, body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getSlotsHandler);
export const POST = withErrorHandler(createSlotHandler);

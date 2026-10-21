import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, getAuthenticatedUserAsync, requireRoleAsync } from '@/lib/api';
import { normalizeRole } from '@laundelle/auth';
import { PlatformService } from '@/services/PlatformService';

async function getSlotsHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const postcode = searchParams.get('postcode') || undefined;
    const plant_id = searchParams.get('plant_id') || undefined;

    const user = await getAuthenticatedUserAsync(req);
    if (user && !postcode) {
        const normRole = normalizeRole(user.role) || user.role?.toLowerCase();
        if (['admin', 'super_admin', 'manager', 'plant_manager'].includes(normRole || '')) {
            const slots = await PlatformService.getAdminSlots(user.sub);
            return successResponse(slots);
        }
    }

    const slots = await PlatformService.getPublicSlots({ postcode, plant_id });
    return successResponse(slots);
}

async function createSlotHandler(req: NextRequest) {
    const user = await requireRoleAsync(req, ['admin', 'super_admin', 'manager', 'plant_manager']);
    const body = await req.json();
    const result = await PlatformService.createSlot(user.sub, body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getSlotsHandler);
export const POST = withErrorHandler(createSlotHandler);

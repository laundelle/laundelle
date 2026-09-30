import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function updateSlotHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['admin', 'super_admin', 'manager']);
    const params = await context.params;
    const slotId = params.id;
    const body = await req.json();
    
    const result = await PlatformService.updateSlot(user.sub, slotId, body);
    return successResponse(result);
}

async function deleteSlotHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['admin', 'super_admin', 'manager']);
    const params = await context.params;
    const slotId = params.id;
    
    const result = await PlatformService.deleteSlot(user.sub, slotId);
    return successResponse(result);
}

export const PATCH = withErrorHandler(updateSlotHandler);
export const DELETE = withErrorHandler(deleteSlotHandler);

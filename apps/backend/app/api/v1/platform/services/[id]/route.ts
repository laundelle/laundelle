import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function updateServiceHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['admin']);
    const params = await context.params;
    const serviceId = params.id;
    const body = await req.json();
    
    const result = await PlatformService.updateService(user.sub, serviceId, body);
    return successResponse(result);
}

export const PATCH = withErrorHandler(updateServiceHandler);

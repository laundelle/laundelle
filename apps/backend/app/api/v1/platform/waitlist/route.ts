import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function getWaitlistHandler(req: NextRequest) {
    requireRole(req, ['admin']); // only admin can get waitlist
    const list = await PlatformService.getAdminWaitlist();
    return successResponse(list);
}

async function joinWaitlistHandler(req: NextRequest) {
    const body = await req.json();
    const result = await PlatformService.joinWaitlist(body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getWaitlistHandler);
export const POST = withErrorHandler(joinWaitlistHandler);

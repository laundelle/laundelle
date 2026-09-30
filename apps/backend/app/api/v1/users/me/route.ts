import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { UserService } from '@/services/UserService';

async function getProfileHandler(req: NextRequest) {
    const user = requireAuth(req);
    const profile = await UserService.getProfile(user.sub);
    return successResponse(profile);
}

async function updateProfileHandler(req: NextRequest) {
    const user = requireAuth(req);
    const body = await req.json();
    const profile = await UserService.updateProfile(user.sub, body);
    return successResponse(profile);
}

export const GET = withErrorHandler(getProfileHandler);
export const PATCH = withErrorHandler(updateProfileHandler);

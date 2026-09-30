import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { UserService } from '@/services/UserService';

async function updatePreferencesHandler(req: NextRequest) {
    const user = requireAuth(req);
    const body = await req.json();
    const result = await UserService.updatePreferences(user.sub, body);
    return successResponse(result);
}

export const PATCH = withErrorHandler(updatePreferencesHandler);

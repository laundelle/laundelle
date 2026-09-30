import { NextRequest } from 'next/server';
import { requireAuth, successResponse, withErrorHandler } from '@/lib/api';
import { NotificationService } from '@/services/NotificationService';

async function getHandler(req: NextRequest) {
    const session = await requireAuth(req);
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const result = await NotificationService.getUserNotifications(session.sub, page, limit);
    return successResponse(result);
}

export const GET = withErrorHandler(getHandler);
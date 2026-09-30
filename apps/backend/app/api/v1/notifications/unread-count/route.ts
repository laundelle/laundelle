import { NextRequest } from 'next/server';
import { requireAuth, successResponse, withErrorHandler } from '@/lib/api';
import { NotificationService } from '@/services/NotificationService';

async function getHandler(req: NextRequest) {
    const session = await requireAuth(req);
    const count = await NotificationService.getUnreadCount(session.sub);
    return successResponse({ count });
}

export const GET = withErrorHandler(getHandler);
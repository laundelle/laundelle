import { NextRequest } from 'next/server';
import { requireAuth, successResponse, withErrorHandler } from '@/lib/api';
import { NotificationService } from '@/services/NotificationService';

async function patchHandler(req: NextRequest) {
    const session = await requireAuth(req);
    const result = await NotificationService.markAllAsRead(session.sub);
    return successResponse({ success: true, modifiedCount: result.modifiedCount });
}

export const PATCH = withErrorHandler(patchHandler);
import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse, withErrorHandler } from '@/lib/api';
import { NotificationService } from '@/services/NotificationService';

async function patchHandler(req: NextRequest, context: any) {
    const session = await requireAuth(req);
    const notificationId = context.params.id;

    const result = await NotificationService.markAsRead(session.sub, notificationId);
    if (!result.success) {
        return errorResponse('NOT_FOUND', result.error || 'Failed to mark as read', 404);
    }
    return successResponse({ success: true });
}

export const PATCH = withErrorHandler(patchHandler);
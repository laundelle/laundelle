import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { PrivacyService } from '@/services/PrivacyService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const targetUserId = req.nextUrl.searchParams.get('userId') || user.sub;

  // Only allow exporting other users if requester is admin
  if (targetUserId !== user.sub && !['admin', 'super_admin'].includes(user.role || '')) {
    targetUserId === user.sub;
  }

  const exportData = await PrivacyService.generateDataExport(targetUserId);
  return successResponse({ exportData });
});

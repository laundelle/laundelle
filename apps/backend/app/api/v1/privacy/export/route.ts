import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuthWithUser, ForbiddenError } from '@/lib/api';
import { PrivacyService } from '@/services/PrivacyService';
import { normalizeRole } from '@laundelle/auth';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { token, dbUser } = await requireAuthWithUser(req);
  const targetUserId = req.nextUrl.searchParams.get('userId');

  const effectiveRole = normalizeRole(dbUser.role || token.role);
  const isAdmin = ['admin', 'super_admin'].includes(effectiveRole || '');

  // Only allow exporting other users if requester has administrative privileges
  if (targetUserId) {
    const isSelf =
      targetUserId === String(dbUser._id) ||
      targetUserId === dbUser.id ||
      targetUserId === dbUser.publicId ||
      targetUserId === dbUser.customerId ||
      targetUserId === token.sub ||
      targetUserId === dbUser.auth0UserId ||
      targetUserId === dbUser.auth0_sub;

    if (!isSelf && !isAdmin) {
      throw new ForbiddenError('Access denied: You are not authorized to export data for another user.');
    }
  }

  const exportTargetId = targetUserId || String(dbUser.publicId || dbUser._id);
  const exportData = await PrivacyService.generateDataExport(exportTargetId);
  return successResponse({ exportData });
});

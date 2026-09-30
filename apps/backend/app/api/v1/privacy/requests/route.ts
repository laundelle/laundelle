import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, BadRequestError } from '@/lib/api';
import { PrivacyService } from '@/services/PrivacyService';
import { getDb } from '@/lib/mongodb';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const db = await getDb();

  // Admin can view all requests; normal users view only their own
  const query = ['admin', 'super_admin'].includes(user.role || '') ? {} : { userId: user.sub };
  const requests = await db.collection('privacy_requests').find(query).sort({ requestedAt: -1 }).toArray();

  return successResponse({ requests });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const body = await req.json();
  const { requestType, reason } = body;

  if (!requestType || !['DELETION', 'EXPORT', 'CORRECTION', 'ACCESS'].includes(requestType)) {
    throw new BadRequestError('Valid requestType (DELETION, EXPORT, CORRECTION, ACCESS) is required.');
  }

  const result = await PrivacyService.createPrivacyRequest({
    userId: user.sub,
    requestType,
    reason
  });

  return successResponse({ privacyRequest: result });
});

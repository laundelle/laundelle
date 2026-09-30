import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OperationalSearchService } from '@/services/OperationalSearchService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  requireRole(req, ['admin', 'super_admin', 'manager']);
  const profile = await OperationalSearchService.getCustomer360(params.id);
  return successResponse({ profile });
});

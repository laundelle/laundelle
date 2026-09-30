import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OperationalSearchService } from '@/services/OperationalSearchService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  requireRole(req, ['admin', 'super_admin', 'manager', 'driver', 'processor']);
  const entityType = req.nextUrl.searchParams.get('entityType') || undefined;

  const history = await OperationalSearchService.getUniversalHistory(params.id, entityType);
  return successResponse({ history });
});

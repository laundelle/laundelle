import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OperationalSearchService } from '@/services/OperationalSearchService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['admin', 'super_admin', 'manager', 'driver', 'processor']);
  const query = req.nextUrl.searchParams.get('q') || '';
  const entityType = req.nextUrl.searchParams.get('entityType') || undefined;
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 25;

  const results = await OperationalSearchService.search(query, { entityType, plantId, limit });
  return successResponse({ results });
});

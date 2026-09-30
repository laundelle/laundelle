import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { AnalyticsService } from '@/services/AnalyticsService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const startDate = req.nextUrl.searchParams.get('startDate') || undefined;
  const endDate = req.nextUrl.searchParams.get('endDate') || undefined;
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);

  const report = await AnalyticsService.generateOperationalReport({ startDate, endDate, plantId });
  return successResponse({ report });
});

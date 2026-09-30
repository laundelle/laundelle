import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { AlertService } from '@/services/AlertService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['admin', 'super_admin', 'manager']);
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);
  const resolvedParam = req.nextUrl.searchParams.get('resolved');
  const resolved = resolvedParam !== null ? resolvedParam === 'true' : undefined;
  const severity = req.nextUrl.searchParams.get('severity') as any;
  const type = req.nextUrl.searchParams.get('type') as any;

  const alerts = await AlertService.listAlerts({ plantId, resolved, severity, type });
  return successResponse({ alerts });
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['admin', 'super_admin', 'manager']);
  const body = await req.json();

  if (!body.alertId) {
    throw new BadRequestError('alertId is required to resolve alert.');
  }

  const resolved = await AlertService.resolveAlert(body.alertId, user.id || 'manager');
  return successResponse({ success: resolved, message: 'Alert resolved.' });
});

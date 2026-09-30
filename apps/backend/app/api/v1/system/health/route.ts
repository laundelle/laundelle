import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { SystemHealthService } from '@/services/SystemHealthService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  requireRole(req, ['admin', 'super_admin', 'manager']);
  const health = await SystemHealthService.checkHealth();
  return successResponse({ health });
});

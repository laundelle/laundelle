import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { CapacityService } from '@/services/CapacityService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  requireRole(req, ['manager', 'admin', 'super_admin']);
  const { id: plantId } = await params;
  if (!plantId) throw new BadRequestError('Plant ID is required.');

  const report = await CapacityService.getPlantCapacityReport(plantId);
  return successResponse({ report });
});

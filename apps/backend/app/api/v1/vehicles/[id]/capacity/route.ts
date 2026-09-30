import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { VehicleService } from '@/services/VehicleService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  requireAuth(req);
  const weightKg = Number(req.nextUrl.searchParams.get('weightKg')) || 0;
  const bags = Number(req.nextUrl.searchParams.get('bags')) || 1;

  const result = await VehicleService.checkVehicleCapacityForAssignment(params.id, weightKg, bags);
  return successResponse({ capacity: result });
});

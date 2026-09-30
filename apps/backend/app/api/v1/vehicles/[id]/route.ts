import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, NotFoundError } from '@/lib/api';
import { VehicleService } from '@/services/VehicleService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  requireAuth(req);
  const vehicle = await VehicleService.getVehicle(params.id);
  if (!vehicle) {
    throw new NotFoundError(`Vehicle ${params.id} not found.`);
  }

  const safety = await VehicleService.checkVehicleSafety(params.id);
  return successResponse({ vehicle, safety });
});

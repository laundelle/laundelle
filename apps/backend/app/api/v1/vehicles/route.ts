import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, requireRole, BadRequestError } from '@/lib/api';
import { VehicleService } from '@/services/VehicleService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);
  const status = req.nextUrl.searchParams.get('status') as any;

  const vehicles = await VehicleService.listVehicles({ plantId, status });
  return successResponse({ vehicles });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (!body.registrationNumber || !body.make || !body.model || !body.plantId) {
    throw new BadRequestError('Missing required vehicle fields (registrationNumber, make, model, plantId).');
  }

  const vehicle = await VehicleService.createVehicle(body, {
    id: user.id || 'system',
    role: user.role || 'manager'
  });

  return successResponse({ vehicle }, 201);
});

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { VehicleService } from '@/services/VehicleService';

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (!body.driverId || !body.driverName) {
    throw new BadRequestError('driverId and driverName are required.');
  }

  const assignment = await VehicleService.assignDriver({
    vehicleId: params.id,
    driverId: body.driverId,
    driverName: body.driverName,
    plantId: body.plantId || user.plant_id || 'main_plant',
    assignedBy: user.id || 'manager',
    reason: body.reason,
    mileageStartKm: body.mileageStartKm
  });

  return successResponse({ assignment }, 201);
});

export const DELETE = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json().catch(() => ({}));

  await VehicleService.unassignDriver(
    params.id,
    user.id || 'manager',
    body.reason || 'Manual unassignment',
    body.mileageEndKm
  );

  return successResponse({ success: true, message: 'Driver successfully unassigned.' });
});

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, requireAuth, BadRequestError } from '@/lib/api';
import { VehicleService } from '@/services/VehicleService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  requireAuth(req);
  const records = await VehicleService.getMaintenanceRecords(params.id);
  return successResponse({ records });
});

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (!body.serviceType || !body.description || body.cost === undefined) {
    throw new BadRequestError('serviceType, description, and cost are required.');
  }

  const record = await VehicleService.addMaintenanceRecord(
    {
      vehicleId: params.id,
      plantId: body.plantId || user.plant_id || 'main_plant',
      serviceType: body.serviceType,
      description: body.description,
      cost: body.cost,
      performedBy: body.performedBy || user.id || 'Manager',
      performedDate: body.performedDate,
      mileageKm: body.mileageKm,
      partsReplaced: body.partsReplaced,
      invoiceUrl: body.invoiceUrl,
      nextScheduledDate: body.nextScheduledDate
    },
    { id: user.id || 'manager', role: user.role || 'manager' }
  );

  return successResponse({ record }, 201);
});

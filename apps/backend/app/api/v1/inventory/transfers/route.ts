import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { InventoryService } from '@/services/InventoryService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const plantId = req.nextUrl.searchParams.get('plantId') || (user.role === 'manager' ? user.plant_id : undefined);
  const status = req.nextUrl.searchParams.get('status') as any;

  const transfers = await InventoryService.getTransfers({ plantId, status });
  return successResponse({ transfers });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (
    !body.sourcePlantId ||
    !body.sourcePlantName ||
    !body.destinationPlantId ||
    !body.destinationPlantName ||
    !body.itemId ||
    !body.quantity
  ) {
    throw new BadRequestError('Missing required transfer parameters.');
  }

  const transfer = await InventoryService.requestTransfer({
    sourcePlantId: body.sourcePlantId,
    sourcePlantName: body.sourcePlantName,
    destinationPlantId: body.destinationPlantId,
    destinationPlantName: body.destinationPlantName,
    itemId: body.itemId,
    quantity: Number(body.quantity),
    requestedBy: user.id || 'manager',
    notes: body.notes
  });

  return successResponse({ transfer }, 201);
});

import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { InventoryService } from '@/services/InventoryService';

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin', 'processor']);
  const body = await req.json();

  if (body.quantity === undefined || !body.type) {
    throw new BadRequestError('quantity and type are required for stock adjustment.');
  }

  const result = await InventoryService.adjustStock({
    itemId: params.id,
    quantity: Number(body.quantity),
    type: body.type,
    referenceId: body.referenceId,
    referenceType: body.referenceType,
    notes: body.notes,
    unitCost: body.unitCost,
    actor: { id: user.id || 'system', role: user.role || 'system' }
  });

  return successResponse(result);
});

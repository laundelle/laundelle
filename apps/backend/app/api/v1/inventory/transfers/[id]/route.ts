import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { InventoryService } from '@/services/InventoryService';

export const PATCH = withErrorHandler(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const user = requireRole(req, ['manager', 'admin', 'super_admin']);
  const body = await req.json();

  if (!body.action) {
    throw new BadRequestError('action is required (APPROVE, DISPATCH, RECEIVE).');
  }

  let updatedTransfer;
  switch (body.action.toUpperCase()) {
    case 'APPROVE':
      updatedTransfer = await InventoryService.approveTransfer(params.id, user.id || 'manager');
      break;
    case 'DISPATCH':
      updatedTransfer = await InventoryService.dispatchTransfer(params.id, user.id || 'manager', body.trackingNotes);
      break;
    case 'RECEIVE':
      updatedTransfer = await InventoryService.receiveTransfer(params.id, user.id || 'manager');
      break;
    default:
      throw new BadRequestError(`Invalid transfer action: ${body.action}. Expected APPROVE, DISPATCH, or RECEIVE.`);
  }

  return successResponse({ transfer: updatedTransfer });
});

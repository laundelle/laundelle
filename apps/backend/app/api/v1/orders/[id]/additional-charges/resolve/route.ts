import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

async function resolveChargeHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['customer', 'user']);
    const params = await context.params;
    const orderId = params.id;
    const body = await req.json();
    const result = await OrderService.resolveAdditionalCharge(user.sub, orderId, body.decision);
    return successResponse(result);
}

export const POST = withErrorHandler(resolveChargeHandler);

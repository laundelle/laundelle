import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

async function rescheduleOrderHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['customer', 'user']);
    const params = await context.params;
    const orderId = params.id;
    const body = await req.json();
    const result = await OrderService.rescheduleOrder(user.sub, orderId, body.newDate, body.newTime);
    return successResponse(result);
}

export const POST = withErrorHandler(rescheduleOrderHandler);

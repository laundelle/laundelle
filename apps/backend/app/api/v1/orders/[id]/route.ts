import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

async function getOrderByIdHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['customer', 'user']);
    const params = await context.params;
    const orderId = params.id;
    const order = await OrderService.getOrderById(orderId, user.sub);
    return successResponse(order);
}

export const GET = withErrorHandler(getOrderByIdHandler);

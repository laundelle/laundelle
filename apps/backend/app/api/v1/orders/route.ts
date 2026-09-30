import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';
import { PaymentService } from '@/services/PaymentService';

async function getOrdersHandler(req: NextRequest) {
    const user = requireRole(req, ['customer', 'user']);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id') || searchParams.get('stripe_session_id');
    if (sessionId) {
        await PaymentService.verifyAndFulfillSession(sessionId);
    }
    const orders = await OrderService.getCustomerOrders(user.sub);
    return successResponse(orders);
}

async function createOrderHandler(req: NextRequest) {
    const user = requireRole(req, ['customer', 'user']);
    const body = await req.json();
    const result = await OrderService.createOrder(user.sub, body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getOrdersHandler);
export const POST = withErrorHandler(createOrderHandler);

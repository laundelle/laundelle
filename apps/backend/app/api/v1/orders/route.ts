import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

async function getOrdersHandler(req: NextRequest) {
    const user = requireRole(req, ['customer', 'user']);
    // SECURITY: Do NOT trigger payment confirmation here.
    // Payment must only be confirmed via:
    //   1. The Stripe webhook (POST /api/stripe/webhook) — primary/authoritative path
    //   2. The explicit confirm-session endpoint (POST /api/stripe/confirm-session) — redirect fallback
    // Passing session_id to GET /orders was silently fulfilling orders without webhook verification.
    const orders = await OrderService.getCustomerOrders(user.sub);
    return successResponse(orders);
}

async function createOrderHandler(req: NextRequest) {
    const user = requireRole(req, ['customer', 'user']);
    const body = await req.json();

    // SECURITY: Block direct creation of online payment orders via this endpoint.
    // All online orders (Stripe) must be created ONLY by the webhook handler when
    // checkout.session.completed fires. Creating orders here before Stripe confirms
    // payment is a critical security bypass.
    const isCash = body.paymentMethod === 'Cash on Delivery' || body.paymentMethod === 'Cash';
    if (!isCash) {
        throw new BadRequestError(
            'Online payment orders cannot be created directly via this endpoint. ' +
            'Orders are automatically created by the payment webhook after Stripe confirms payment. ' +
            'Please complete your payment via the Stripe checkout page.'
        );
    }

    const result = await OrderService.createOrder(user.sub, body);
    return successResponse(result, 201);
}

export const GET = withErrorHandler(getOrdersHandler);
export const POST = withErrorHandler(createOrderHandler);

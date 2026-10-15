import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse, requireRoleAsync, resolveLaundelleUser, BadRequestError } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

const ALL_AUTHENTICATED_ROLES = [
    'customer',
    'user',
    'driver',
    'processor',
    'manager',
    'plant_manager',
    'admin',
    'super_admin'
];

async function getOrdersHandler(req: NextRequest) {
    const user = await requireRoleAsync(req, ALL_AUTHENTICATED_ROLES);
    const dbUser = await resolveLaundelleUser(user);
    const customerId = String(dbUser?._id || dbUser?.publicId || user.sub);
    // SECURITY: Do NOT trigger payment confirmation here.
    // Payment must only be confirmed via:
    //   1. The Stripe webhook (POST /api/stripe/webhook) — primary/authoritative path
    //   2. The explicit confirm-session endpoint (POST /api/stripe/confirm-session) — redirect fallback
    // Passing session_id to GET /orders was silently fulfilling orders without webhook verification.
    const orders = await OrderService.getCustomerOrders(customerId);
    return successResponse(orders);
}

async function createOrderHandler(req: NextRequest): Promise<NextResponse> {
    await requireRoleAsync(req, ALL_AUTHENTICATED_ROLES);
    const body = await req.json();

    // Cash on Delivery is strictly disabled. Only online Stripe payments are accepted.
    if (body.paymentMethod === 'Cash on Delivery' || body.paymentMethod === 'Cash') {
        throw new BadRequestError('Cash on Delivery is not accepted. All orders must be paid securely online via Stripe checkout.');
    }

    // All online orders must be created only by the Stripe webhook upon successful payment confirmation.
    throw new BadRequestError(
        'Online payment orders cannot be created directly via this endpoint. ' +
        'Orders are automatically created by the payment webhook after Stripe confirms payment. ' +
        'Please complete your payment via the Stripe checkout page.'
    );
}

export const GET = withErrorHandler(getOrdersHandler);
export const POST = withErrorHandler(createOrderHandler);

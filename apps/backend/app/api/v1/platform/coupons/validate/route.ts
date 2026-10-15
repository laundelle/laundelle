import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, BadRequestError } from '@/lib/api';
import { PricingChargeService } from '@/services/PricingChargeService';

export const dynamic = 'force-dynamic';

async function validateCouponHandler(req: NextRequest) {
    const body = await req.json();
    const { code, subtotal } = body || {};

    if (!code) {
        throw new BadRequestError('Coupon code is required.');
    }

    const orderSubtotal = Math.max(0, Number(subtotal) || 0);
    const result = await PricingChargeService.validateCoupon(code, orderSubtotal);

    return successResponse(result);
}

export const POST = withErrorHandler(validateCouponHandler);

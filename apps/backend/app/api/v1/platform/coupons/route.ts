import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PricingChargeService } from '@/services/PricingChargeService';

export const dynamic = 'force-dynamic';

async function getCouponsHandler(req: NextRequest) {
    requireRole(req, ['admin', 'super_admin']);
    const coupons = await PricingChargeService.getCoupons();
    return successResponse(coupons);
}

async function createCouponHandler(req: NextRequest) {
    const user = requireRole(req, ['admin', 'super_admin']);
    const body = await req.json();
    const coupon = await PricingChargeService.createCoupon(user.sub, body);
    return successResponse(coupon, 201);
}

export const GET = withErrorHandler(getCouponsHandler);
export const POST = withErrorHandler(createCouponHandler);

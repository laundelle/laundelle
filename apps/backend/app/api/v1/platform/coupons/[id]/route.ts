import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PricingChargeService } from '@/services/PricingChargeService';

export const dynamic = 'force-dynamic';

async function updateCouponHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = requireRole(req, ['admin', 'super_admin']);
    const { id } = await params;
    const body = await req.json();
    const updated = await PricingChargeService.updateCoupon(user.sub, id, body);
    return successResponse(updated);
}

async function deleteCouponHandler(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = requireRole(req, ['admin', 'super_admin']);
    const { id } = await params;
    const result = await PricingChargeService.deleteCoupon(user.sub, id);
    return successResponse(result);
}

export const PUT = withErrorHandler(updateCouponHandler);
export const DELETE = withErrorHandler(deleteCouponHandler);

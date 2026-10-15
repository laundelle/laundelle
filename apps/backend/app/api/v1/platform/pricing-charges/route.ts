import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PricingChargeService } from '@/services/PricingChargeService';

export const dynamic = 'force-dynamic';

async function getPricingChargesHandler() {
    const charges = await PricingChargeService.getPricingCharges();
    return successResponse(charges);
}

async function updatePricingChargesHandler(req: NextRequest) {
    const user = requireRole(req, ['admin', 'super_admin']);
    const body = await req.json();
    const updated = await PricingChargeService.updatePricingCharges(user.sub, body);
    return successResponse(updated);
}

export const GET = withErrorHandler(getPricingChargesHandler);
export const PUT = withErrorHandler(updatePricingChargesHandler);
export const POST = withErrorHandler(updatePricingChargesHandler);

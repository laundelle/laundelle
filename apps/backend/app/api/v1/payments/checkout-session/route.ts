import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole } from '@/lib/api';
import { PaymentService } from '@/services/PaymentService';

async function createCheckoutSessionHandler(req: NextRequest) {
    const user = requireRole(req, ['customer', 'user']);
    const body = await req.json();
    
    // We only need the orderId. The amount and items will be determined server-side
    // by PaymentService to prevent client tampering.
    const origin = req.headers.get('origin') || 'https://laundry2u.com';
    const result = await PaymentService.createCheckoutSession(user.sub, body.orderId, origin);
    
    return successResponse(result);
}

export const POST = withErrorHandler(createCheckoutSessionHandler);

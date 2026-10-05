import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/PaymentService';
import { getAuthenticatedUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authUser = getAuthenticatedUser(req);
        const authenticatedUserId = authUser?.sub || authUser?.userId || authUser?.id;
        if (!authenticatedUserId) {
            return NextResponse.json({
                confirmed: false,
                status: 'error',
                error: 'Authentication required.'
            }, { status: 401 });
        }
        const body = await req.json();
        const sessionId = body.sessionId || body.session_id;

        if (!sessionId || typeof sessionId !== 'string') {
            return NextResponse.json({
                confirmed: false,
                status: 'error',
                error: 'Missing required parameter: sessionId'
            }, { status: 400 });
        }

        // READ-ONLY verification: checks Stripe status AND looks up webhook-created order.
        // This method NEVER creates orders. Order creation is exclusively done by the webhook.
        const result = await PaymentService.verifySessionPayment(sessionId, authenticatedUserId);

        if (result.status === 'paid' && result.order) {
            // Order was created by the webhook and found in DB
            return NextResponse.json({
                confirmed: true,
                status: 'paid',
                order: result.order
            });
        }

        if (result.status === 'pending') {
            // Stripe confirms payment but webhook hasn't processed yet
            // Client should show "processing" state and may poll
            return NextResponse.json({
                confirmed: false,
                status: 'pending',
                error: result.message || 'Order is still being processed. Please wait a moment.'
            }, { status: 202 });
        }

        // unpaid or error
        return NextResponse.json({
            confirmed: false,
            status: result.status,
            error: result.message || 'Payment could not be verified.'
        }, { status: 400 });

    } catch (error: any) {
        console.error('[Stripe Confirm Session] Error:', error);
        return NextResponse.json({
            confirmed: false,
            status: 'error',
            error: error.message || 'Payment verification failed'
        }, { status: 500 });
    }
}

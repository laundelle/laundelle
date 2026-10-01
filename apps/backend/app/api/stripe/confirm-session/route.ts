import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/PaymentService';
import { getAuthenticatedUser } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authUser = getAuthenticatedUser(req);
        const body = await req.json();
        const sessionId = body.sessionId || body.session_id;

        if (!sessionId || typeof sessionId !== 'string') {
            return NextResponse.json({ 
                confirmed: false, 
                error: 'Missing required parameter: sessionId' 
            }, { status: 400 });
        }

        // Verify session directly with Stripe API and fulfill if payment_status is 'paid'
        const order = await PaymentService.verifyAndFulfillSession(sessionId);

        if (!order) {
            return NextResponse.json({ 
                confirmed: false, 
                error: 'Stripe payment has not been completed or could not be verified.' 
            }, { status: 400 });
        }

        return NextResponse.json({
            confirmed: true,
            order
        });
    } catch (error: any) {
        console.error('[Stripe Confirm Session] Error:', error);
        return NextResponse.json({ 
            confirmed: false, 
            error: error.message || 'Payment verification failed' 
        }, { status: 500 });
    }
}

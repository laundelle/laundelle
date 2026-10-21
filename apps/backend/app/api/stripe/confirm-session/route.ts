import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/PaymentService';
import { getAuthenticatedUserAsync } from '@/lib/api';

export const dynamic = 'force-dynamic';

async function handleConfirmSession(req: NextRequest) {
    try {
        const authUser = await getAuthenticatedUserAsync(req);
        const authenticatedUserId = authUser?.sub || authUser?.userId || authUser?.id || authUser?.publicId;

        let sessionId: string | null = null;
        if (req.method === 'GET') {
            sessionId = req.nextUrl.searchParams.get('sessionId') || req.nextUrl.searchParams.get('session_id');
        } else {
            const body = await req.json().catch(() => ({}));
            sessionId = body.sessionId || body.session_id;
        }

        if (!sessionId || typeof sessionId !== 'string') {
            return NextResponse.json({
                confirmed: false,
                status: 'error',
                error: 'Missing required parameter: sessionId'
            }, { status: 400 });
        }

        // Authoritative Stripe session payment verification.
        // Verifies payment status directly with Stripe API and returns the confirmed order.
        const result = await PaymentService.verifySessionPayment(sessionId, authenticatedUserId, authUser);

        if (result.status === 'paid' && result.order) {
            return NextResponse.json({
                confirmed: true,
                status: 'paid',
                order: result.order
            });
        }

        if (result.status === 'pending') {
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

export async function POST(req: NextRequest) {
    return handleConfirmSession(req);
}

export async function GET(req: NextRequest) {
    return handleConfirmSession(req);
}

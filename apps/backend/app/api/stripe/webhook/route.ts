import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/PaymentService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const sig = req.headers.get('stripe-signature');
        const rawBody = await req.text();
        
        const result = await PaymentService.handleStripeWebhook(rawBody, sig);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[Stripe Webhook] Error:', err.message);
        // We return 400 for signature mismatch or invalid payload, to tell Stripe not to retry if it's our fault (or to retry if it's 500).
        // Since we throw BadRequestError, it has a status.
        return new NextResponse(`Webhook error: ${err.message}`, { status: err.status || 400 });
    }
}

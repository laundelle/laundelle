import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/services/PaymentService';
import { BadRequestError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const sig = req.headers.get('stripe-signature');
        const rawBody = await req.text();
        
        const result = await PaymentService.handleStripeWebhook(rawBody, sig);
        return NextResponse.json(result);
    } catch (err: any) {
        console.error('[Stripe Webhook] Error:', err.message);
        // Invalid signatures and payloads are permanent client errors. Any internal
        // processing error must be a 5xx so Stripe retries the verified event.
        const status = err instanceof BadRequestError ? err.status : 500;
        return new NextResponse(`Webhook error: ${err.message}`, { status });
    }
}


export async function GET() {
    // SECURITY: Do NOT reveal webhook configuration state (STRIPE_WEBHOOK_SECRET presence, etc.)
    // Only return a generic liveness signal to confirm the endpoint is reachable.
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
}

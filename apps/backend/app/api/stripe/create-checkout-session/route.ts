import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

let stripeInstance: Stripe | null = null;
function getStripe(): Stripe {
    if (!stripeInstance) {
        stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
            apiVersion: (process.env.STRIPE_API_VERSION || '2025-06-30.basil') as any,
        });
    }
    return stripeInstance;
}


import { getAuthenticatedUser } from '@/lib/api';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
    try {
        const authUser = getAuthenticatedUser(req);
        const { amount, orderId, customerEmail, items, userId, orderPayload } = await req.json();

        const effectiveUserId = authUser?.sub || authUser?.userId || authUser?.id || userId || (orderPayload as any)?.userId || (orderPayload as any)?.user_id || 'guest';
        if (!authUser && (effectiveUserId === 'guest' || !effectiveUserId)) {
            return NextResponse.json({ error: 'Authentication required. You must be logged in to place an order.' }, { status: 401 });
        }

        if (!amount) {
            return NextResponse.json({ error: 'Missing required parameter: amount' }, { status: 400 });
        }

        const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const db = await getDb();
        const now = new Date().toISOString();

        // Store pending checkout payload in database (official Order record is ONLY created when payment succeeds)
        await db.collection('pending_checkouts').insertOne({
            _id: checkoutId as any,
            userId: effectiveUserId,
            orderPayload: orderPayload || { amount, items, customerEmail },
            status: 'pending',
            createdAt: now,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

        const origin = req.headers.get('origin') || process.env.CUSTOMER_APP_URL || process.env.APP_URL || 'http://localhost:3000';

        const line_items = [{
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: `Laundelle Laundry Service`,
                    description: items && items.length > 0
                        ? items.map((i: any) => `${i.quantity || 1}x ${i.name}`).join(', ')
                        : 'Doorstep pickup, premium care & delivery',
                },
                unit_amount: Math.round(Number(amount) * 100),
            },
            quantity: 1,
        }];

        const targetOrderId = orderId || (orderPayload as any)?.id || (orderPayload as any)?._id || '';

        const stripe = getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${origin}/orders?payment=success&checkout_id=${checkoutId}&session_id={CHECKOUT_SESSION_ID}${targetOrderId ? `&orderId=${targetOrderId}` : ''}`,
            cancel_url: `${origin}/orders?payment=cancel&checkout_id=${checkoutId}${targetOrderId ? `&orderId=${targetOrderId}` : ''}`,
            customer_email: customerEmail || undefined,
            metadata: {
                checkoutId,
                orderId: targetOrderId,
                userId: effectiveUserId,
            },
        });

        await db.collection('pending_checkouts').updateOne(
            { _id: checkoutId as any },
            { $set: { stripeSessionId: session.id } }
        );

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (error: any) {
        console.error('Stripe Session Creation Failed:', error);
        return NextResponse.json({ error: error.message || 'Stripe Session Creation Failed' }, { status: 500 });
    }
}

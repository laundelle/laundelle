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
import { PaymentService } from '@/services/PaymentService';
import { generateOrderId } from '@laundelle/ids';

const MAX_ORDER_AMOUNT_GBP = 9999;
const MIN_ORDER_AMOUNT_GBP = 0.50;

export async function POST(req: NextRequest) {
    try {
        const authUser = getAuthenticatedUser(req);
        const body = await req.json();
        const { orderId, customerEmail, items, orderPayload } = body;
        const clientAmount = Number(body.amount || 0);

        const effectiveUserId = authUser?.sub || authUser?.userId || authUser?.id;
        if (!effectiveUserId) {
            return NextResponse.json({ error: 'Authentication required. You must be logged in to place an order.' }, { status: 401 });
        }

        const serverAmount = Number((orderPayload as any)?.total ?? clientAmount);

        if (!serverAmount || isNaN(serverAmount) || serverAmount < MIN_ORDER_AMOUNT_GBP) {
            return NextResponse.json({ error: `Invalid order total. Minimum order amount is GBP${MIN_ORDER_AMOUNT_GBP.toFixed(2)}.` }, { status: 400 });
        }
        if (serverAmount > MAX_ORDER_AMOUNT_GBP) {
            return NextResponse.json({ error: `Order total GBP${serverAmount.toFixed(2)} exceeds the maximum allowed amount of GBP${MAX_ORDER_AMOUNT_GBP}.` }, { status: 400 });
        }
        if (clientAmount && Math.abs(clientAmount - serverAmount) > 0.01) {
            return NextResponse.json({ error: 'Checkout total does not match the order total. Please refresh your cart and try again.' }, { status: 400 });
        }

        await PaymentService.assertWebhookOperational();

        const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const rawCandidateId = orderId || (orderPayload as any)?.id || (orderPayload as any)?._id || (orderPayload as any)?.publicId;
        const targetOrderId = (rawCandidateId && typeof rawCandidateId === 'string' && rawCandidateId.startsWith('ORD-')) ? rawCandidateId : generateOrderId();
        const db = await getDb();
        const now = new Date().toISOString();

        await db.collection('pending_checkouts').insertOne({
            _id: checkoutId as any,
            userId: effectiveUserId,
            orderPayload: {
                ...(orderPayload || { amount: serverAmount, items, customerEmail }),
                id: targetOrderId,
                publicId: targetOrderId,
                userId: effectiveUserId,
                user_id: effectiveUserId,
            },
            authorizedAmount: serverAmount,
            status: 'pending',
            createdAt: now,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

        // Register initial order in orders collection as pending_payment.
        // If the customer leaves mid-way or closes the gateway, the order is safely visible in their orders page.
        if (orderPayload) {
            const initialOrderDoc = {
                ...orderPayload,
                id: targetOrderId,
                publicId: targetOrderId,
                userId: effectiveUserId,
                user_id: effectiveUserId,
                total: serverAmount,
                amount: serverAmount,
                status: 'pending_payment',
                statusLabel: 'Pending Payment Authorization',
                paymentStatus: 'Pending',
                payment_status: 'Pending',
                isPaid: false,
                created_at: now,
                updated_at: now,
                timeline_events: [
                    { status: 'booking_created', label: 'Order Created', completed: true, current: true, time: 'Just now' },
                    { status: 'pending_payment', label: 'Payment Pending', completed: false, current: false, time: 'Pending' }
                ]
            };
            await db.collection('orders').updateOne(
                { $or: [{ id: targetOrderId }, { _id: targetOrderId as any }] } as any,
                { $setOnInsert: initialOrderDoc },
                { upsert: true }
            );
        }

        // Dynamic origin resolution supporting mobile forwarded ports, tunnels, and proxies
        let origin = (body.returnUrl || body.return_url || body.origin || '').toString().trim().replace(/\/+$/, '');
        if (!origin) {
            const forwardedHost = req.headers.get('x-forwarded-host');
            const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
            if (forwardedHost) {
                origin = `${forwardedProto}://${forwardedHost}`;
            } else {
                origin = req.headers.get('origin') || (req.headers.get('referer') ? new URL(req.headers.get('referer')!).origin : req.nextUrl.origin);
            }
        }
        origin = origin.replace(/\/+$/, '');

        const stripe = getStripe();

        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items && items.length > 0
            ? items.map((item: any) => ({
                price_data: {
                    currency: 'gbp',
                    product_data: { name: item.name || 'Laundelle Service' },
                    unit_amount: Math.round(Number(item.price) * 100),
                },
                quantity: Number(item.quantity) || 1,
            }))
            : [{
                price_data: {
                    currency: 'gbp',
                    product_data: { name: 'Laundelle Laundry Service' },
                    unit_amount: Math.round(serverAmount * 100),
                },
                quantity: 1,
            }];

        // Create a Stripe-hosted Checkout Session.
        // Card entry happens on Stripe's own HTTPS domain (checkout.stripe.com),
        // eliminating all browser insecure-connection warnings.
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            customer_email: customerEmail || undefined,
            success_url: `${origin}/?payment=verify&session_id={CHECKOUT_SESSION_ID}&orderId=${encodeURIComponent(targetOrderId)}`,
            cancel_url: `${origin}/?payment=cancel&session_id={CHECKOUT_SESSION_ID}&orderId=${encodeURIComponent(targetOrderId)}&checkoutId=${encodeURIComponent(checkoutId)}`,
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

        await db.collection('orders').updateOne(
            { $or: [{ id: targetOrderId }, { _id: targetOrderId as any }] } as any,
            { $set: { stripe_session_id: session.id, stripeSessionId: session.id } }
        );

        console.log(`[create-checkout-session] Session ${session.id} created for user ${effectiveUserId}, amount GBP${serverAmount.toFixed(2)}`);
        return NextResponse.json({ url: session.url, sessionId: session.id, checkoutId, orderId: targetOrderId });
    } catch (error: any) {
        console.error('[create-checkout-session] Failed:', error);
        return NextResponse.json({ error: error.message || 'Stripe Session Creation Failed' }, { status: 500 });
    }
}

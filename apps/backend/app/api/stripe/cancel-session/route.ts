import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api';
import { getDb } from '@/lib/mongodb';
import { generateOrderId } from '@laundelle/ids';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authUser = getAuthenticatedUser(req);
        const effectiveUserId = authUser?.sub || authUser?.userId || authUser?.id;
        if (!effectiveUserId) {
            return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, orderId, checkoutId, reason } = body;

        const db = await getDb();
        const now = new Date().toISOString();

        // 1. Look up pending checkout
        let pendingCheckout: any = null;
        if (checkoutId) {
            pendingCheckout = await db.collection('pending_checkouts').findOne({ _id: checkoutId as any });
        }
        if (!pendingCheckout && sessionId) {
            pendingCheckout = await db.collection('pending_checkouts').findOne({ stripeSessionId: sessionId });
        }

        if (pendingCheckout && pendingCheckout.userId && pendingCheckout.userId !== effectiveUserId) {
            return NextResponse.json({ error: 'You are not authorized to cancel this checkout.' }, { status: 403 });
        }

        const targetOrderId = orderId || pendingCheckout?.orderPayload?.id || pendingCheckout?.orderPayload?._id;
        const failureReason = typeof reason === 'string' && reason.trim()
            ? reason.trim().slice(0, 200)
            : 'Payment cancelled by customer or card was declined';

        // 2. If order already exists in orders collection, verify ownership and mark it as payment_failed
        if (targetOrderId) {
            const existingOrder = await db.collection('orders').findOne({
                $or: [{ id: targetOrderId }, { _id: targetOrderId }]
            });

            if (existingOrder) {
                const orderOwner = existingOrder.userId || existingOrder.user_id || existingOrder.customerId || existingOrder.customer_id;
                if (orderOwner && orderOwner !== effectiveUserId) {
                    return NextResponse.json({ error: 'You are not authorized to cancel this order.' }, { status: 403 });
                }

                // If it is already marked Paid, don't overwrite
                if (existingOrder.payment_status !== 'Paid' && existingOrder.paymentStatus !== 'Paid') {
                    const updatePayload: any = {
                        $set: {
                            status: 'payment_failed',
                            statusLabel: 'Payment Failed',
                            payment_status: 'Failed',
                            paymentStatus: 'Failed',
                            isPaid: false,
                            paymentFailureReason: failureReason,
                            updated_at: now,
                        },
                        $push: {
                            timeline_events: {
                                event: 'payment_failed',
                                label: 'Payment Cancelled or Declined',
                                reason: failureReason,
                                timestamp: now
                            }
                        }
                    };
                    await db.collection('orders').updateOne(
                        { $or: [{ id: targetOrderId }, { _id: targetOrderId }] } as any,
                        updatePayload
                    );
                }
            } else if (pendingCheckout?.orderPayload) {
                // Insert failed order so it shows in customer orders page
                const orderToInsert = {
                    ...pendingCheckout.orderPayload,
                    id: targetOrderId,
                    publicId: targetOrderId,
                    userId: effectiveUserId || pendingCheckout.userId,
                    user_id: effectiveUserId || pendingCheckout.userId,
                    status: 'payment_failed',
                    statusLabel: 'Payment Failed',
                    payment_status: 'Failed',
                    paymentStatus: 'Failed',
                    isPaid: false,
                    paymentFailureReason: failureReason,
                    stripe_session_id: sessionId || pendingCheckout.stripeSessionId,
                    created_at: now,
                    updated_at: now,
                    timeline_events: [
                        { status: 'booking_created', label: 'Order Created', completed: true, current: false, time: 'Just now' },
                        { status: 'payment_failed', label: 'Payment Cancelled or Declined', completed: true, current: true, time: 'Just now', reason: failureReason }
                    ]
                };
                await db.collection('orders').insertOne(orderToInsert);
            }
        } else if (pendingCheckout?.orderPayload) {
            const generatedOrderId = generateOrderId();
            const orderToInsert = {
                ...pendingCheckout.orderPayload,
                id: generatedOrderId,
                publicId: generatedOrderId,
                userId: effectiveUserId || pendingCheckout.userId,
                user_id: effectiveUserId || pendingCheckout.userId,
                status: 'payment_failed',
                statusLabel: 'Payment Failed',
                payment_status: 'Failed',
                paymentStatus: 'Failed',
                isPaid: false,
                paymentFailureReason: failureReason,
                stripe_session_id: sessionId || pendingCheckout.stripeSessionId,
                created_at: now,
                updated_at: now,
                timeline_events: [
                    { status: 'booking_created', label: 'Order Created', completed: true, current: false, time: 'Just now' },
                    { status: 'payment_failed', label: 'Payment Cancelled or Declined', completed: true, current: true, time: 'Just now', reason: failureReason }
                ]
            };
            await db.collection('orders').insertOne(orderToInsert);
        }

        if (pendingCheckout) {
            await db.collection('pending_checkouts').updateOne(
                { _id: pendingCheckout._id },
                { $set: { status: 'cancelled', cancelledAt: now, failureReason } }
            );
        }

        console.log(`[cancel-session] Processed cancellation for order ${targetOrderId || checkoutId}`);
        return NextResponse.json({ success: true, orderId: targetOrderId });
    } catch (err: any) {
        console.error('[cancel-session] Error:', err);
        return NextResponse.json({ error: err.message || 'Failed to cancel session' }, { status: 500 });
    }
}

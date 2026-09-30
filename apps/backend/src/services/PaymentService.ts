import { NotificationService } from '@/services/NotificationService';
import { getDb } from '@/lib/mongodb';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import Stripe from 'stripe';
import { ObjectId } from 'mongodb';
import { OrderService, locatePlantAndDriverForOrder } from '@/services/OrderService';
import { generatePaymentId, buildEntityLookupQuery } from '@laundelle/ids';

export class PaymentService {
    private static getStripe(): Stripe {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
        return new Stripe(key, { apiVersion: '2023-10-16' as any });
    }

    /**
     * Verifies Stripe checkout session status and creates the order if paid.
     */
    static async verifyAndFulfillSession(sessionId: string) {
        if (!sessionId) return null;
        try {
            const stripe = this.getStripe();
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (session && session.payment_status === 'paid') {
                const db = await getDb();
                const now = new Date().toISOString();
                return await this.processCheckoutCompleted(db, session, now);
            }
        } catch (e) {
            console.error('[PaymentService] verifyAndFulfillSession error:', e);
        }
        return null;
    }

    /**
     * Creates a Stripe Checkout Session purely based on the server-side authoritative Order total.
     */
    static async createCheckoutSession(userId: string, orderId: string, origin: string) {
        if (!orderId) throw new BadRequestError('Missing required parameter: orderId');
        
        const db = await getDb();
        const order = await db.collection('orders').findOne(buildEntityLookupQuery(orderId, 'order'));
        
        if (!order) throw new NotFoundError('Order not found');
        if (order.customer_id !== userId && order.customerId !== userId) throw new ForbiddenError('Access denied: You do not own this order');
        if (order.payment_status === 'Paid') throw new BadRequestError('Order is already paid');
        
        // Authoritative amount calculation
        // For Laundelle, the order.total is computed at creation.
        // Even if we wanted to recount from order.items, the db document is the source of truth, not the frontend request.
        const amount = order.total || 0;
        if (amount <= 0) throw new BadRequestError('Invalid order total for payment');

        const canonicalOrderId = order.publicId || order.orderNumber || order.id || orderId;

        const line_items = [{
            price_data: {
                currency: 'gbp',
                product_data: {
                    name: `Laundelle Order #${canonicalOrderId}`,
                },
                unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
        }];

        const stripe = this.getStripe();
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${origin}/orders?payment=success&orderId=${canonicalOrderId}`,
            cancel_url: `${origin}/orders?payment=cancel&orderId=${canonicalOrderId}`,
            customer_email: order.customerEmail || undefined,
            metadata: {
                orderId: canonicalOrderId,
                internalOrderId: order.id || String(order._id),
                userId,
            },
        });

        // Audit the checkout session initiation
        await AuditService.recordOrderEvent({
            orderId,
            action: 'stripe_checkout_initiated',
            actorId: userId,
            actorRole: 'customer',
            metadata: { amount, stripeSessionId: session.id }
        });

        return { sessionId: session.id, url: session.url };
    }

    /**
     * Handles the Stripe Webhook, verifies signatures, and applies idempotent state updates.
     */
    static async handleStripeWebhook(rawBody: string, signature: string | null) {
        if (!signature) throw new BadRequestError('Missing stripe-signature header');
        
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        let event: Stripe.Event;

        if (webhookSecret && webhookSecret !== 'whsec_YOUR_STRIPE_WEBHOOK_SIGNING_SECRET') {
            try {
                const stripe = this.getStripe();
                event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
            } catch (err: any) {
                console.error('[Stripe Webhook] Signature verification failed:', err.message);
                throw new BadRequestError(`Webhook error: ${err.message}`);
            }
        } else {
            if (process.env.NODE_ENV === 'production') {
                throw new BadRequestError('STRIPE_WEBHOOK_SECRET is not configured. Webhook rejected for security.');
            }
            console.warn('[Stripe Webhook] Running in non-production without signature verification — set STRIPE_WEBHOOK_SECRET.');
            try {
                event = JSON.parse(rawBody) as Stripe.Event;
            } catch {
                throw new BadRequestError('Invalid JSON payload');
            }
        }

        const db = await getDb();
        const now = new Date().toISOString();

        // Idempotency Check: Prevent duplicate webhook processing
        try {
            await db.collection('stripe_events').insertOne({
                _id: event.id as any,
                type: event.type,
                processedAt: now
            });
        } catch (e: any) {
            if (e.code === 11000) {
                console.log(`[Stripe Webhook] Event ${event.id} already processed. Idempotency triggered.`);
                return { received: true, idempotent: true };
            }
            throw e;
        }

        console.log(`[Stripe Webhook] Processing verified new event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            await this.processCheckoutCompleted(db, event.data.object as Stripe.Checkout.Session, now);
        } else if (event.type === 'payment_intent.payment_failed') {
            await this.processPaymentFailed(db, event.data.object as Stripe.PaymentIntent, now);
        }

        return { received: true };
    }

    private static async processCheckoutCompleted(db: any, session: Stripe.Checkout.Session, now: string) {
        const checkoutId = session.metadata?.checkoutId;
        const orderId = session.metadata?.orderId;
        const userId = session.metadata?.userId || 'guest';
        const stripeSessionId = session.id;

        // 1. Idempotency Check: if order already exists for this stripeSessionId, return existing
        const existingOrder = await db.collection('orders').findOne({ stripe_session_id: stripeSessionId });
        if (existingOrder) {
            return existingOrder;
        }

        // 2. Check pending_checkouts collection
        let pendingCheckout = null;
        if (checkoutId) {
            pendingCheckout = await db.collection('pending_checkouts').findOne({ _id: checkoutId });
        }
        if (!pendingCheckout) {
            pendingCheckout = await db.collection('pending_checkouts').findOne({ stripeSessionId: stripeSessionId });
        }

        if (pendingCheckout) {
            // Check if this checkout belongs to an existing order in the database
            const targetOrderId = pendingCheckout.orderPayload?.id || pendingCheckout.orderPayload?._id || orderId;
            let existingDbOrder = null;
            if (targetOrderId) {
                existingDbOrder = await db.collection('orders').findOne(buildEntityLookupQuery(targetOrderId, 'order'));
            }

            if (existingDbOrder) {
                await db.collection('pending_checkouts').deleteOne({ _id: pendingCheckout._id });
                return await this.updateExistingOrderToPaid(db, existingDbOrder, session, now);
            }

            const createdOrder = await OrderService.createPaidOrderFromCheckout(
                pendingCheckout.userId || userId,
                pendingCheckout,
                session
            );
            await db.collection('pending_checkouts').deleteOne({ _id: pendingCheckout._id });
            return createdOrder;
        }

        // 3. Fallback for existing order matching orderId
        if (orderId) {
            const order = await db.collection('orders').findOne(buildEntityLookupQuery(orderId, 'order'));
            if (!order) {
                console.error(`[Stripe Webhook] Neither pending checkout (${checkoutId}) nor order (${orderId}) found in database.`);
                return null;
            }
            return await this.updateExistingOrderToPaid(db, order, session, now);
        }
    }

    private static async updateExistingOrderToPaid(db: any, order: any, session: Stripe.Checkout.Session, now: string) {
        const orderId = order.id || String(order._id);
        const stripeSessionId = session.id;
        const paymentIntentId = session.payment_intent;
        const amountGBP = session.amount_total ? session.amount_total / 100 : (order.total || 0);
        const userId = session.metadata?.userId || order.customer_id || order.userId || order.user_id || 'guest';

        let assignedDriverId = order.assigned_driver_id || order.driver?.id || null;
        let assignedDriver = order.driver || null;
        let plantId = order.plant_id || null;
        let managerId = order.manager_id || null;
        let plantName = order.plant_name || null;
        let plantCode = order.plant_code || null;

        // If plant or driver wasn't assigned at order creation, locate now based on postcode/address
        if (!plantId || !assignedDriverId) {
            const rawPostcode = order.postcode || order.address?.postcode || '';
            const rawAddress = typeof order.address === 'string' ? order.address : `${order.address?.line1 || ''} ${order.address?.city || ''} ${order.address?.postcode || ''}`;
            const routing = await locatePlantAndDriverForOrder(db, rawPostcode, rawAddress, now);
            if (!plantId && routing.plantId) {
                plantId = routing.plantId;
                plantName = routing.plantName;
                plantCode = routing.plantCode;
                managerId = routing.managerId;
            }
            if (!assignedDriverId && routing.driverId && routing.driver) {
                assignedDriverId = routing.driverId;
                assignedDriver = {
                    id: routing.driverId,
                    name: routing.driver.full_name,
                    phone: routing.driver.phone || '+44 7700 900123',
                    vehicle: routing.driver.vehicle || 'Logistics Van',
                    rating: routing.driver.rating || 4.9,
                    avatar: routing.driver.avatar_url,
                    estimatedArrival: 'Tomorrow'
                };
            }
        }

        const status = assignedDriverId ? 'collection_scheduled' : 'booking_confirmed';
        const statusLabel = assignedDriverId ? 'Collection Scheduled' : 'Booking Confirmed';

        const updateOps: any = {
            $set: {
                payment_status: 'Paid',
                paymentStatus: 'Paid',
                isPaid: true,
                stripe_session_id: stripeSessionId,
                stripe_payment_intent_id: paymentIntentId,
                paidAt: now,
                status: status,
                statusLabel: statusLabel,
                updated_at: now
            },
            $push: {
                timeline_events: {
                    $each: [
                        {
                            event: 'payment_confirmed',
                            label: 'Payment Confirmed via Stripe',
                            stripeSessionId,
                            paymentIntentId: typeof paymentIntentId === 'string' ? paymentIntentId : undefined,
                            amount: amountGBP,
                            currency: session.currency?.toUpperCase() || 'GBP',
                            timestamp: now
                        }
                    ]
                }
            }
        };

        if (plantId && plantId !== order.plant_id) {
            updateOps.$set.plant_id = plantId;
            updateOps.$set.plant_name = plantName;
            updateOps.$set.plant_code = plantCode;
            updateOps.$set.manager_id = managerId;
            updateOps.$push.timeline_events.$each.push({
                event: 'plant_forwarded',
                label: `Routed to Plant: ${plantName || plantId}`,
                actor: 'system',
                plantId,
                managerId,
                timestamp: now
            });
        }

        if (assignedDriverId && assignedDriver) {
            updateOps.$set.assigned_driver_id = assignedDriverId;
            updateOps.$set.driver = assignedDriver;
            const alreadyHasDriverEvent = (order.timeline_events || []).some((e: any) => e.event === 'driver_assigned');
            if (!alreadyHasDriverEvent) {
                updateOps.$push.timeline_events.$each.push({
                    event: 'driver_assigned',
                    label: `Driver Assigned: ${assignedDriver.name}`,
                    actor: 'system',
                    driverId: assignedDriverId,
                    driverName: assignedDriver.name,
                    timestamp: now
                });
            }
        }

        // 1. Update Order Status in Database
        await db.collection('orders').updateOne(
            { $or: [{ id: orderId }, { _id: order._id || orderId }] },
            updateOps
        );

        // Notify assigned driver and manager
        if (assignedDriverId) {
            const driverQueryId = ObjectId.isValid(assignedDriverId) ? new ObjectId(assignedDriverId) : assignedDriverId;
            await db.collection('users').updateOne(
                { _id: driverQueryId as any },
                { $set: { last_assigned_at: now, availability: 'busy' } }
            );

            await NotificationService.createNotification({
                userId: String(assignedDriverId),
                title: '🚚 New Collection Assigned',
                message: `You have been assigned order #${orderId} (${order.postcode || 'Customer Collection'}).`,
                type: 'driver',
                orderId
            });
        }

        if (managerId) {
            await NotificationService.createNotification({
                userId: String(managerId),
                title: '📦 New Order Confirmed',
                message: `Order #${orderId} (${order.postcode || ''}) confirmed and assigned to ${assignedDriver?.name || 'driver'}.`,
                type: 'plant_order',
                orderId
            });
        }

        // 2. Record Financial Payment
        const paymentPublicId = generatePaymentId();
        await db.collection('payments').insertOne({
            publicId: paymentPublicId,
            id: paymentPublicId,
            paymentId: paymentPublicId,
            customerId: userId,
            customer_id: userId,
            orderId: orderId,
            order_id: orderId,
            stripe_session_id: stripeSessionId,
            stripe_payment_intent_id: paymentIntentId,
            amount: amountGBP,
            currency: session.currency?.toUpperCase() || 'GBP',
            status: 'succeeded',
            payment_method: 'stripe',
            paid_at: now,
            created_at: now
        });

        // 3. Notify Customer
        if (userId && userId !== 'guest') {
            await NotificationService.createNotification({
                userId,
                title: '✅ Booking Confirmed',
                message: `Payment of £${amountGBP.toFixed(2)} received. Your collection for order #${orderId} is confirmed!`,
                type: 'booking',
                orderId,
            });
        }

        // 4. Audit Log
        await AuditService.recordOrderEvent({
            orderId,
            action: 'stripe_payment_confirmed',
            actorId: userId || 'system',
            actorRole: userId !== 'guest' ? 'customer' : 'system',
            before: { payment_status: order.payment_status, status: order.status },
            after: { payment_status: 'Paid', status: status },
            metadata: { amount: amountGBP, stripeSessionId }
        });

        // 5. Update user stats
        if (userId && userId !== 'guest') {
            const userQueryId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
            await db.collection('users').updateOne(
                { _id: userQueryId as any },
                {
                    $inc: { total_orders: 1, lifetime_spend: order.total || amountGBP },
                    $set: { last_order_at: now, updated_at: now }
                }
            );
        }

        return await db.collection('orders').findOne({ $or: [{ id: orderId }, { _id: order._id || orderId }] });
    }

    private static async processPaymentFailed(db: any, intent: Stripe.PaymentIntent, now: string) {
        const orderId = intent.metadata?.orderId;
        const userId = intent.metadata?.userId;

        if (!orderId) return;

        await db.collection('orders').updateOne(
            { id: orderId },
            { 
                $set: { 
                    payment_status: 'Failed', 
                    paymentStatus: 'Failed',
                    status: 'payment_failed',
                    statusLabel: 'Payment Failed',
                    updated_at: now 
                } 
            }
        );

        if (userId) {
            await NotificationService.createNotification({
                userId,
                title: '❌ Payment Failed',
                message: `Your payment for order #${orderId} failed. Please update your payment method and try again.`,
                type: 'billing',
                orderId,
                });
        }

        await AuditService.recordOrderEvent({
            orderId,
            action: 'stripe_payment_failed',
            actorId: userId || 'system',
            actorRole: userId ? 'customer' : 'system',
            after: { payment_status: 'Failed', status: 'payment_failed' },
            metadata: { stripeIntentId: intent.id }
        });
    }
}

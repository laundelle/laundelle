import { getDb, getMongoClient } from '@/lib/mongodb';
import { BadRequestError, NotFoundError } from '@/lib/api';
import { AuditService } from '@/services/AuditService';
import { ObjectId } from 'mongodb';

export interface CustomChargeItem {
    id: string;
    name: string;
    type: 'fixed' | 'percentage';
    amount: number;
    enabled: boolean;
    description?: string;
}

export interface PricingChargesDoc {
    _id: string;
    taxRate: number;
    taxEnabled: boolean;
    deliveryCharge: number;
    freeDeliveryThreshold: number;
    smallOrderFee: number;
    smallOrderThreshold: number;
    serviceFee: number;
    otherCharges: CustomChargeItem[];
    updated_at: string;
    updated_by?: string;
}

export interface CouponDoc {
    _id: string;
    id: string;
    code: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount?: number | null;
    expiresAt?: string | null;
    usageLimit?: number | null;
    usageCount: number;
    isActive: boolean;
    created_at: string;
    updated_at: string;
    createdBy?: string;
}

const DEFAULT_PRICING_CHARGES: PricingChargesDoc = {
    _id: 'default_pricing_charges',
    taxRate: 20,
    taxEnabled: true,
    deliveryCharge: 0.00,
    freeDeliveryThreshold: 30.00,
    smallOrderFee: 2.50,
    smallOrderThreshold: 20.00,
    serviceFee: 3.49,
    otherCharges: [
        {
            id: 'chg_eco_wash',
            name: 'Eco-Friendly Detergent Surcharge',
            type: 'fixed',
            amount: 0.99,
            enabled: false,
            description: 'Optional hypoallergenic plant-based wash'
        }
    ],
    updated_at: new Date().toISOString(),
    updated_by: 'system'
};

const DEFAULT_COUPONS = [
    {
        id: 'cpn_welcome20',
        code: 'WELCOME20',
        description: 'New customer welcome voucher — 20% off entire order',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 20.00,
        maxDiscountAmount: 15.00,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
    },
    {
        id: 'cpn_clean10',
        code: 'CLEAN10',
        description: 'Standard discount code — 10% off laundry items',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 15.00,
        maxDiscountAmount: 10.00,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
    },
    {
        id: 'cpn_fiveoff',
        code: 'SAVE5',
        description: '£5.00 off orders over £30.00',
        discountType: 'fixed',
        discountValue: 5.00,
        minOrderAmount: 30.00,
        maxDiscountAmount: null,
        expiresAt: null,
        usageLimit: null,
        usageCount: 0,
        isActive: true,
    }
];

export class PricingChargeService {
    // ─── PRICING & CHARGES ────────────────────────────────────────────────────────

    static async getPricingCharges(): Promise<PricingChargesDoc> {
        const db = await getDb();
        let record = await db.collection('pricing_charges').findOne({ _id: 'default_pricing_charges' as any });

        if (!record) {
            await db.collection('pricing_charges').updateOne(
                { _id: 'default_pricing_charges' as any },
                { $setOnInsert: DEFAULT_PRICING_CHARGES },
                { upsert: true }
            );
            record = await db.collection('pricing_charges').findOne({ _id: 'default_pricing_charges' as any });
        }

        return (record || DEFAULT_PRICING_CHARGES) as PricingChargesDoc;
    }

    static async updatePricingCharges(adminId: string, updates: Partial<PricingChargesDoc>) {
        const db = await getDb();
        const now = new Date().toISOString();

        const safeDoc: any = {
            updated_at: now,
            updated_by: adminId,
        };

        if (updates.taxRate !== undefined) {
            const tax = Number(updates.taxRate);
            if (isNaN(tax) || tax < 0 || tax > 100) throw new BadRequestError('Tax rate must be between 0% and 100%.');
            safeDoc.taxRate = Math.round(tax * 100) / 100;
        }

        if (updates.taxEnabled !== undefined) {
            safeDoc.taxEnabled = Boolean(updates.taxEnabled);
        }

        if (updates.deliveryCharge !== undefined) {
            const dc = Number(updates.deliveryCharge);
            if (isNaN(dc) || dc < 0) throw new BadRequestError('Delivery charge must be a positive number or zero.');
            safeDoc.deliveryCharge = Math.round(dc * 100) / 100;
        }

        if (updates.freeDeliveryThreshold !== undefined) {
            const fdt = Number(updates.freeDeliveryThreshold);
            if (isNaN(fdt) || fdt < 0) throw new BadRequestError('Free delivery threshold must be positive.');
            safeDoc.freeDeliveryThreshold = Math.round(fdt * 100) / 100;
        }

        if (updates.smallOrderFee !== undefined) {
            const sof = Number(updates.smallOrderFee);
            if (isNaN(sof) || sof < 0) throw new BadRequestError('Small order fee must be positive or zero.');
            safeDoc.smallOrderFee = Math.round(sof * 100) / 100;
        }

        if (updates.smallOrderThreshold !== undefined) {
            const sot = Number(updates.smallOrderThreshold);
            if (isNaN(sot) || sot < 0) throw new BadRequestError('Small order threshold must be positive.');
            safeDoc.smallOrderThreshold = Math.round(sot * 100) / 100;
        }

        if (updates.serviceFee !== undefined) {
            const sf = Number(updates.serviceFee);
            if (isNaN(sf) || sf < 0) throw new BadRequestError('Service fee must be positive or zero.');
            safeDoc.serviceFee = Math.round(sf * 100) / 100;
        }

        if (updates.otherCharges !== undefined && Array.isArray(updates.otherCharges)) {
            safeDoc.otherCharges = updates.otherCharges.map((chg, idx) => ({
                id: chg.id || `chg_${Date.now()}_${idx}`,
                name: String(chg.name || 'Additional Fee').trim(),
                type: chg.type === 'percentage' ? 'percentage' : 'fixed',
                amount: Math.max(0, Number(chg.amount) || 0),
                enabled: chg.enabled !== false,
                description: String(chg.description || '').trim()
            }));
        }

        await db.collection('pricing_charges').updateOne(
            { _id: 'default_pricing_charges' as any },
            { $set: safeDoc },
            { upsert: true }
        );

        await AuditService.recordEvent({
            entityType: 'platform_pricing',
            entityId: 'default_pricing_charges',
            action: 'pricing_charges_updated',
            actorId: adminId,
            actorRole: 'admin',
            metadata: { updates: safeDoc }
        });

        return await this.getPricingCharges();
    }

    // ─── COUPONS MANAGEMENT ───────────────────────────────────────────────────────

    static async getCoupons(): Promise<CouponDoc[]> {
        const db = await getDb();
        let coupons = await db.collection('coupons').find({}).sort({ created_at: -1 }).toArray();

        // Seed default coupons if none exist in the database
        if (!coupons || coupons.length === 0) {
            const now = new Date().toISOString();
            const docsToInsert = DEFAULT_COUPONS.map((c) => ({
                _id: c.id as any,
                ...c,
                created_at: now,
                updated_at: now,
                createdBy: 'system'
            }));
            await db.collection('coupons').insertMany(docsToInsert);
            coupons = await db.collection('coupons').find({}).sort({ created_at: -1 }).toArray();
        }

        return coupons.map((c: any) => ({
            ...c,
            id: c.id || String(c._id)
        }));
    }

    static async createCoupon(adminId: string, data: any): Promise<CouponDoc> {
        const db = await getDb();
        const now = new Date().toISOString();

        const rawCode = String(data.code || '').trim().toUpperCase();
        if (!rawCode || rawCode.length < 3) {
            throw new BadRequestError('Coupon code must be at least 3 characters long.');
        }

        // Verify uniqueness
        const existing = await db.collection('coupons').findOne({ code: rawCode });
        if (existing) {
            throw new BadRequestError(`Coupon code "${rawCode}" already exists.`);
        }

        const discountType = data.discountType === 'fixed' ? 'fixed' : 'percentage';
        const discountValue = Number(data.discountValue);
        if (isNaN(discountValue) || discountValue <= 0) {
            throw new BadRequestError('Discount value must be greater than 0.');
        }

        if (discountType === 'percentage' && discountValue > 100) {
            throw new BadRequestError('Percentage discount cannot exceed 100%.');
        }

        const couponId = `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const newCoupon: CouponDoc = {
            _id: couponId as any,
            id: couponId,
            code: rawCode,
            description: String(data.description || `${rawCode} Promotional Discount`).trim(),
            discountType,
            discountValue: Math.round(discountValue * 100) / 100,
            minOrderAmount: Math.max(0, Number(data.minOrderAmount) || 0),
            maxDiscountAmount: data.maxDiscountAmount ? Math.max(0, Number(data.maxDiscountAmount)) : null,
            expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
            usageLimit: data.usageLimit ? Math.max(1, parseInt(data.usageLimit, 10)) : null,
            usageCount: 0,
            isActive: data.isActive !== false,
            created_at: now,
            updated_at: now,
            createdBy: adminId
        };

        await db.collection('coupons').insertOne(newCoupon as any);

        await AuditService.recordEvent({
            entityType: 'coupon',
            entityId: newCoupon.id,
            action: 'coupon_created',
            actorId: adminId,
            actorRole: 'admin',
            metadata: { code: rawCode, discountType, discountValue }
        });

        return newCoupon;
    }

    static async updateCoupon(adminId: string, couponId: string, updates: any) {
        const db = await getDb();
        const now = new Date().toISOString();

        const safeUpdates: any = { updated_at: now };

        if (updates.description !== undefined) safeUpdates.description = String(updates.description).trim();
        if (updates.discountValue !== undefined) {
            const val = Number(updates.discountValue);
            if (isNaN(val) || val <= 0) throw new BadRequestError('Invalid discount value.');
            safeUpdates.discountValue = Math.round(val * 100) / 100;
        }
        if (updates.discountType !== undefined) {
            safeUpdates.discountType = updates.discountType === 'fixed' ? 'fixed' : 'percentage';
        }
        if (updates.minOrderAmount !== undefined) {
            safeUpdates.minOrderAmount = Math.max(0, Number(updates.minOrderAmount) || 0);
        }
        if (updates.maxDiscountAmount !== undefined) {
            safeUpdates.maxDiscountAmount = updates.maxDiscountAmount ? Math.max(0, Number(updates.maxDiscountAmount)) : null;
        }
        if (updates.expiresAt !== undefined) {
            safeUpdates.expiresAt = updates.expiresAt ? new Date(updates.expiresAt).toISOString() : null;
        }
        if (updates.usageLimit !== undefined) {
            safeUpdates.usageLimit = updates.usageLimit ? Math.max(1, parseInt(updates.usageLimit, 10)) : null;
        }
        if (updates.isActive !== undefined) {
            safeUpdates.isActive = Boolean(updates.isActive);
        }

        const res = await db.collection('coupons').updateOne(
            { $or: [{ id: couponId }, { _id: couponId as any }] },
            { $set: safeUpdates }
        );

        if (res.matchedCount === 0) throw new NotFoundError('Coupon not found.');

        await AuditService.recordEvent({
            entityType: 'coupon',
            entityId: couponId,
            action: 'coupon_updated',
            actorId: adminId,
            actorRole: 'admin',
            metadata: { updates: safeUpdates }
        });

        const updated = await db.collection('coupons').findOne({ $or: [{ id: couponId }, { _id: couponId as any }] });
        return { ...updated, id: updated?.id || String(updated?._id) };
    }

    static async deleteCoupon(adminId: string, couponId: string) {
        const db = await getDb();
        const res = await db.collection('coupons').deleteOne({
            $or: [{ id: couponId }, { _id: couponId as any }]
        });

        if (res.deletedCount === 0) throw new NotFoundError('Coupon not found.');

        await AuditService.recordEvent({
            entityType: 'coupon',
            entityId: couponId,
            action: 'coupon_deleted',
            actorId: adminId,
            actorRole: 'admin'
        });

        return { success: true };
    }

    static async validateCoupon(code: string, subtotal: number) {
        const db = await getDb();
        const cleanCode = String(code || '').trim().toUpperCase();
        if (!cleanCode) {
            return { valid: false, message: 'Please enter a valid coupon code.' };
        }

        // Query coupon by code
        const coupon = await db.collection('coupons').findOne({ code: cleanCode });
        if (!coupon) {
            return { valid: false, message: `Promo code "${cleanCode}" is not recognized.` };
        }

        if (!coupon.isActive) {
            return { valid: false, message: `Promo code "${cleanCode}" is currently inactive.` };
        }

        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { valid: false, message: `Promo code "${cleanCode}" has expired.` };
        }

        if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
            return { valid: false, message: `Promo code "${cleanCode}" has reached its maximum redemptions limit.` };
        }

        const minOrder = Number(coupon.minOrderAmount) || 0;
        if (subtotal < minOrder) {
            return {
                valid: false,
                message: `Order subtotal must be at least £${minOrder.toFixed(2)} to apply "${cleanCode}". (Current: £${subtotal.toFixed(2)})`
            };
        }

        // Calculate discount amount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = subtotal * (coupon.discountValue / 100);
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
        }

        discountAmount = Math.round(discountAmount * 100) / 100;

        return {
            valid: true,
            discountAmount,
            coupon: {
                id: coupon.id || String(coupon._id),
                code: coupon.code,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
            },
            message: `Coupon "${coupon.code}" applied! You save £${discountAmount.toFixed(2)}.`
        };
    }

    /**
     * Helper to detect if a MongoDB error indicates that transactions are unsupported
     * by the deployment (e.g. standalone Mongo, test mocks, or uninitialized replica set).
     */
    private static isTransactionUnsupported(err: any): boolean {
        if (!err) return false;
        const msg = String(err.message || '');
        return (
            err.code === 20 || // IllegalOperation
            err.code === 263 || // OperationNotSupportedInTransaction
            msg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
            msg.includes('This MongoDB deployment does not support transactions') ||
            msg.includes('Transactions are not supported') ||
            msg.includes('Cannot start transaction') ||
            msg.includes('session.withTransaction is not a function') ||
            msg.includes('startSession is not a function')
        );
    }

    /**
     * Atomically redeems a coupon against an order, enforcing usage limits and webhook idempotency.
     * Prefers MongoDB multi-document transactions when supported by the deployment (e.g., MongoDB Atlas replica sets).
     * Automatically falls back to a failure-safe reservation and reconciliation pattern if transactions are unavailable
     * (e.g., standalone local MongoDB or test mocks).
     */
    static async redeemCoupon(
        code: string,
        orderId: string,
        customerId: string,
        stripeSessionId?: string
    ): Promise<{ success: boolean; alreadyRedeemed?: boolean; reason?: string }> {
        const cleanCode = String(code || '').trim().toUpperCase();
        if (!cleanCode) return { success: false, reason: 'invalid_code' };
        if (!orderId) return { success: false, reason: 'missing_order_id' };

        const db = await getDb();
        const now = new Date().toISOString();

        // 1. Initial fast idempotency check
        const existingRedemption = await db.collection('coupon_redemptions').findOne({
            $or: [
                { orderId, code: cleanCode },
                ...(stripeSessionId ? [{ stripeSessionId, code: cleanCode }] : [])
            ]
        });

        if (existingRedemption) {
            if (existingRedemption.status === 'completed' || !existingRedemption.status) {
                return { success: true, alreadyRedeemed: true };
            }
        }

        // 2. Attempt transactional redemption (MongoDB Atlas / Replica Set)
        try {
            const client = await getMongoClient();
            if (client && typeof client.startSession === 'function') {
                const session = client.startSession();
                try {
                    let txResult: { success: boolean; alreadyRedeemed?: boolean; reason?: string } | null = null;
                    await session.withTransaction(async () => {
                        const inTxExisting = await db.collection('coupon_redemptions').findOne({
                            $or: [
                                { orderId, code: cleanCode },
                                ...(stripeSessionId ? [{ stripeSessionId, code: cleanCode }] : [])
                            ]
                        }, { session });

                        if (inTxExisting) {
                            if (inTxExisting.status === 'completed' || !inTxExisting.status) {
                                txResult = { success: true, alreadyRedeemed: true };
                                return;
                            }
                        }

                        // Atomic increment with limit check and per-order tracking
                        const updateRes = await db.collection('coupons').updateOne(
                            {
                                code: cleanCode,
                                isActive: true,
                                redeemedOrderIds: { $ne: orderId },
                                $or: [
                                    { usageLimit: null },
                                    { usageLimit: { $exists: false } },
                                    { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
                                ]
                            },
                            {
                                $inc: { usageCount: 1 },
                                $addToSet: { redeemedOrderIds: orderId },
                                $set: { updated_at: now }
                            },
                            { session }
                        );

                        if (updateRes.modifiedCount === 0) {
                            // Verify if order was already counted in a prior attempt
                            const couponDoc = await db.collection('coupons').findOne({ code: cleanCode }, { session });
                            const alreadyCounted = couponDoc && Array.isArray(couponDoc.redeemedOrderIds) && couponDoc.redeemedOrderIds.includes(orderId);
                            if (!alreadyCounted) {
                                txResult = { success: false, reason: 'limit_exhausted_or_inactive' };
                                return;
                            }
                        }

                        // Upsert redemption record within transaction
                        await db.collection('coupon_redemptions').updateOne(
                            { orderId, code: cleanCode },
                            {
                                $set: {
                                    code: cleanCode,
                                    orderId,
                                    customerId,
                                    stripeSessionId: stripeSessionId || null,
                                    status: 'completed',
                                    redeemedAt: now,
                                    updatedAt: now
                                }
                            },
                            { upsert: true, session }
                        );

                        txResult = { success: true };
                    });

                    if (txResult) {
                        return txResult;
                    }
                } finally {
                    await session.endSession().catch(() => {});
                }
            }
        } catch (txErr: any) {
            if (!this.isTransactionUnsupported(txErr)) {
                console.error('[PricingChargeService] Transaction execution failed:', txErr.message);
                throw txErr;
            }
            // Fall through to non-transactional fallback if deployment lacks replica set transactions
        }

        // 3. Fallback: Non-transactional atomic reservation pattern
        return await this.redeemCouponNonTransactional(db, cleanCode, orderId, customerId, stripeSessionId, now);
    }

    /**
     * Fallback redemption implementation when MongoDB multi-document transactions are unavailable.
     * Guarantees:
     * - Atomic usage limit enforcement via conditional update
     * - Idempotency per orderId using redeemedOrderIds set tracking
     * - Safe retry recovery without double-counting
     * - No blind or unconditional compensating decrements that could corrupt counters during concurrent races
     */
    private static async redeemCouponNonTransactional(
        db: any,
        cleanCode: string,
        orderId: string,
        customerId: string,
        stripeSessionId?: string,
        now: string = new Date().toISOString()
    ): Promise<{ success: boolean; alreadyRedeemed?: boolean; reason?: string }> {
        // Idempotency pre-check
        const existing = await db.collection('coupon_redemptions').findOne({
            $or: [
                { orderId, code: cleanCode },
                ...(stripeSessionId ? [{ stripeSessionId, code: cleanCode }] : [])
            ]
        });

        if (existing) {
            if (existing.status === 'completed' || !existing.status) {
                return { success: true, alreadyRedeemed: true };
            }
        }

        // Conditional reservation on coupon:
        // Ensures orderId cannot increment usageCount more than once, even under concurrent retries
        const updateRes = await db.collection('coupons').updateOne(
            {
                code: cleanCode,
                isActive: true,
                redeemedOrderIds: { $ne: orderId },
                $or: [
                    { usageLimit: null },
                    { usageLimit: { $exists: false } },
                    { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
                ]
            },
            {
                $inc: { usageCount: 1 },
                $addToSet: { redeemedOrderIds: orderId },
                $set: { updated_at: now }
            }
        );

        if (updateRes.modifiedCount === 0) {
            // Check whether this order was previously allocated usage in coupons
            const couponDoc = await db.collection('coupons').findOne({ code: cleanCode });
            const alreadyAllocated = couponDoc && Array.isArray(couponDoc.redeemedOrderIds) && couponDoc.redeemedOrderIds.includes(orderId);

            if (!alreadyAllocated) {
                return { success: false, reason: 'limit_exhausted_or_inactive' };
            }
            // If alreadyAllocated is true, usage was previously counted for this order,
            // so we proceed to ensure the redemption record is written without double-incrementing.
        }

        // Persist redemption record
        try {
            await db.collection('coupon_redemptions').updateOne(
                { orderId, code: cleanCode },
                {
                    $set: {
                        code: cleanCode,
                        orderId,
                        customerId,
                        stripeSessionId: stripeSessionId || null,
                        status: 'completed',
                        redeemedAt: now,
                        updatedAt: now
                    }
                },
                { upsert: true }
            );
            return { success: true };
        } catch (insertErr: any) {
            // If duplicate key error (11000) occurs from a concurrent race, the record was already persisted
            if (insertErr.code === 11000) {
                return { success: true, alreadyRedeemed: true };
            }

            // If persistence genuinely failed and this specific invocation freshly incremented usage,
            // perform a precise, conditional rollback that only targets this specific orderId.
            // NEVER perform an unconditional decrement that could corrupt other orders' counts.
            if (updateRes.modifiedCount > 0) {
                try {
                    await db.collection('coupons').updateOne(
                        { code: cleanCode, redeemedOrderIds: orderId },
                        {
                            $inc: { usageCount: -1 },
                            $pull: { redeemedOrderIds: orderId }
                        }
                    );
                } catch (rollbackErr: any) {
                    console.error('[PricingChargeService] Conditional rollback failed:', rollbackErr);
                }
            }

            throw insertErr;
        }
    }
}


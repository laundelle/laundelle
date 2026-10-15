import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuthAsync,
    resolveLaundelleUser,
    withErrorHandler,
    ForbiddenError,
    NotFoundError,
    BadRequestError
} from '@/lib/api';
import { normalizeRole } from '@laundelle/auth';
import { getDb } from '@/lib/mongodb';

async function getOrderItemsHandler(req: NextRequest, context: any) {
    const token = await requireAuthAsync(req);
    const dbUser = await resolveLaundelleUser(token);

    const params = await context.params;
    const orderId = params?.id;
    if (!orderId) {
        throw new BadRequestError('Order ID is required.');
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({
        $or: [
            { id: orderId },
            { publicId: orderId }
        ]
    } as any);

    if (!order) {
        throw new NotFoundError('Order not found.');
    }

    const effectiveRole = normalizeRole(dbUser?.role || token.role || 'customer');

    // 1. Customer Access Control (Strict Ownership)
    if (effectiveRole === 'customer') {
        const userId = dbUser?._id ? String(dbUser._id) : token.sub;
        const customerId = dbUser?.customerId || dbUser?.id;
        const userEmail = (dbUser?.email || token.email || '').toLowerCase().trim();

        const isOwner =
            (order.customer_id && (order.customer_id === userId || order.customer_id === customerId)) ||
            (order.customerId && (order.customerId === userId || order.customerId === customerId)) ||
            (order.customerEmail && userEmail && order.customerEmail.toLowerCase().trim() === userEmail);

        if (!isOwner) {
            throw new ForbiddenError('Access denied: You do not own this order.');
        }
    }
    // 2. Staff Access Control (Plant & Assignment Scoping)
    else if (effectiveRole === 'driver') {
        const driverId = String(dbUser?._id || token.sub);
        const staffId = dbUser?.staffId;
        const isAssigned =
            order.assigned_driver_id === driverId ||
            (staffId && order.assigned_driver_id === staffId);

        if (!isAssigned) {
            throw new ForbiddenError('Access denied: You are not assigned to this order.');
        }
    } else if (effectiveRole === 'processor') {
        const processorId = String(dbUser?._id || token.sub);
        const plantId = dbUser?.plant_id || dbUser?.plantId;
        const isAssignedOrPlant =
            order.assigned_processor_id === processorId ||
            (plantId && order.plant_id === plantId);

        if (!isAssignedOrPlant) {
            throw new ForbiddenError('Access denied: Order is outside your assigned facility or task.');
        }
    } else if (effectiveRole === 'plant_manager') {
        const plantId = dbUser?.plant_id || dbUser?.plantId;
        if (plantId && order.plant_id && order.plant_id !== plantId) {
            throw new ForbiddenError('Access denied: Order belongs to a different plant.');
        }
    } else if (effectiveRole !== 'super_admin') {
        throw new ForbiddenError('Access denied: Unauthorized role.');
    }

    const items = await db.collection('order_items').find({ orderId: order.id || orderId }).toArray();
    return NextResponse.json({ success: true, items });
}

async function patchOrderItemsHandler(req: NextRequest, context: any) {
    const token = await requireAuthAsync(req);
    const dbUser = await resolveLaundelleUser(token);
    const effectiveRole = normalizeRole(dbUser?.role || token.role || 'customer');

    if (!['processor', 'plant_manager', 'super_admin'].includes(effectiveRole)) {
        throw new ForbiddenError('Access denied: Only processing staff or administrators can update garment items.');
    }

    const params = await context.params;
    const orderId = params?.id;
    if (!orderId) {
        throw new BadRequestError('Order ID is required.');
    }

    const body = await req.json().catch(() => ({}));
    const { itemId, conditionNotes, damagePhotos, qcStatus, rewashRequired } = body;

    if (!itemId) {
        throw new BadRequestError('itemId is required.');
    }

    const db = await getDb();
    const order = await db.collection('orders').findOne({
        $or: [
            { id: orderId },
            { publicId: orderId }
        ]
    } as any);

    if (!order) {
        throw new NotFoundError('Order not found.');
    }

    // Verify plant isolation for plant manager or processor
    if (effectiveRole === 'plant_manager' || effectiveRole === 'processor') {
        const plantId = dbUser?.plant_id || dbUser?.plantId;
        if (plantId && order.plant_id && order.plant_id !== plantId) {
            throw new ForbiddenError('Access denied: Order belongs to a different plant.');
        }
    }

    const updateSet: any = { updatedAt: new Date().toISOString() };
    if (conditionNotes !== undefined) updateSet.conditionNotes = conditionNotes;
    if (damagePhotos !== undefined) updateSet.damagePhotos = damagePhotos;
    if (qcStatus !== undefined) updateSet.qcStatus = qcStatus;
    if (rewashRequired !== undefined) updateSet.rewashRequired = rewashRequired;

    const result = await db.collection('order_items').updateOne(
        { id: itemId, orderId: order.id || orderId },
        { $set: updateSet }
    );

    if (result.matchedCount === 0) {
        throw new NotFoundError('Order item not found.');
    }

    return NextResponse.json({ success: true });
}

export const GET = withErrorHandler(getOrderItemsHandler);
export const PATCH = withErrorHandler(patchOrderItemsHandler);

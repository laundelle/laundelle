import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { getDb } from '@/lib/mongodb';

export async function GET(req: NextRequest, context: any) {
    try {
        await requireAuth(req);

        const params = await context.params;
        const orderId = params.id;

        const db = await getDb();
        const items = await db.collection('order_items').find({ orderId }).toArray();

        return NextResponse.json({ success: true, items });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

export async function PATCH(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);

        const params = await context.params;
        const orderId = params.id;
        const body = await req.json();
        const { itemId, conditionNotes, damagePhotos, qcStatus, rewashRequired } = body;

        if (!itemId) {
            return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
        }

        const db = await getDb();
        const updateSet: any = { updatedAt: new Date().toISOString() };
        if (conditionNotes !== undefined) updateSet.conditionNotes = conditionNotes;
        if (damagePhotos !== undefined) updateSet.damagePhotos = damagePhotos;
        if (qcStatus !== undefined) updateSet.qcStatus = qcStatus;
        if (rewashRequired !== undefined) updateSet.rewashRequired = rewashRequired;

        await db.collection('order_items').updateOne(
            { id: itemId, orderId },
            { $set: updateSet }
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

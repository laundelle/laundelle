import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);
        const body = await req.json();

        const { orderIds, targetId, type } = body;
        if (!Array.isArray(orderIds) || !type) {
            return NextResponse.json({ error: 'orderIds array and type are required.' }, { status: 400 });
        }

        const data = await ManagerService.reassignBatchOrders(
            session.sub,
            orderIds,
            targetId || null,
            type
        );
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

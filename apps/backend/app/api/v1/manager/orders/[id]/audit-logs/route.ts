import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);
        const params = await context.params;
        const orderId = params?.id || context.params?.id;

        if (!orderId) {
            return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
        }

        const data = await ManagerService.getOrderAuditLogs(session.sub, orderId);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

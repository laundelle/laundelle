import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

export async function PATCH(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        const user = requireRole(req, ['admin', 'super_admin']);
        const body = await req.json();
        const params = await context.params;
        const orderId = params?.id || context.params?.id;

        await OrderService.adminUpdateOrderStatus(session.sub, user.role || 'admin', undefined, orderId, body.newStatus, body.reason);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 400 });
    }
}

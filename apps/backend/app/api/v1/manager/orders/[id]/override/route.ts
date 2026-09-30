import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        const user = requireRole(req, ['manager', 'admin', 'super_admin']);
        const body = await req.json();
        const params = await context.params;
        const orderId = params?.id || context.params?.id;

        if (!body.action) {
            return NextResponse.json({ error: 'Action parameter is required.' }, { status: 400 });
        }

        const data = await ManagerService.managerExecuteOverride(
            session.sub,
            orderId,
            body.action,
            body.data,
            user.role
        );
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 400 });
    }
}

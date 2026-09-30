import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);
        const body = await req.json();
        const params = await context.params;
        const driverId = params?.id || context.params?.id;

        if (!driverId) {
            return NextResponse.json({ error: 'Driver ID is required.' }, { status: 400 });
        }

        const data = await ManagerService.reassignAllDriverOrders(
            session.sub,
            driverId,
            body.targetDriverId !== undefined ? body.targetDriverId : null
        );
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

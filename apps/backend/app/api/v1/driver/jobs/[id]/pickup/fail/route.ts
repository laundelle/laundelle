import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver', 'admin', 'super_admin']);

        const body = await req.json();
        const { reason, notes, photoUrl, location } = body;

        if (!reason) {
            return NextResponse.json({ error: 'Pickup failure reason is required.' }, { status: 400 });
        }

        const params = await context.params;
        const orderId = params.id;

        const result = await DriverService.recordPickupFailure({
            driverId: session.sub,
            orderId,
            reason,
            notes,
            photoUrl,
            location
        });

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

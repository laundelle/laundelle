import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver']);

        await DriverService.startDelivery(session.sub, (await context.params).id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

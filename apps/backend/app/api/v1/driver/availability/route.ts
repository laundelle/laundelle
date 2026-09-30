import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function PUT(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver']);

        const { isAvailable } = await req.json();
        await DriverService.updateAvailability(session.sub, isAvailable);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver']);

        const { packageQr } = await req.json();
        if (!packageQr) return NextResponse.json({ error: 'Package QR code is required.' }, { status: 400 });

        const params = await context.params;
        const orderId = params?.id || context.params?.id;
        await DriverService.confirmHandover(session.sub, orderId, packageQr);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

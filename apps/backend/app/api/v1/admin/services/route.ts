import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const services = await PlatformService.getAdminServices();
        return NextResponse.json({ services });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const body = await req.json();
        const created = await PlatformService.createService(user._id, body);
        return NextResponse.json({ success: true, service: created });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

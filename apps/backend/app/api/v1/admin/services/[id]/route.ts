import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

export async function PATCH(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const { id } = await context.params;
        const body = await req.json();
        const res = await PlatformService.updateService(user._id, id, body);
        return NextResponse.json(res);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

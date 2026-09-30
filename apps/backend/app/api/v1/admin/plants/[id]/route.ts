import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function PATCH(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const body = await req.json();
        const params = await context.params;
        const plantPayload = body.plantData || body;
        const data = await AdminService.updatePlant(session.sub, params.id, plantPayload);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

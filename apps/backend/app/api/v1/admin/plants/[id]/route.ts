import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function PATCH(req: NextRequest, context: any) {
    try {
        const authContext = await requirePermission(req, 'plants:update');
        const body = await req.json();
        const params = await context.params;
        const plantPayload = body.plantData || body;
        const actorId = String(authContext.dbUser._id || authContext.token.sub);
        const data = await AdminService.updatePlant(actorId, params.id, plantPayload);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 400 });
    }
}

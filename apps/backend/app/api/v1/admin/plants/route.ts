import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const data = await AdminService.getPlants();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const body = await req.json();
        const plantPayload = body.plantData || body;
        const data = await AdminService.createPlant(session.sub, plantPayload);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

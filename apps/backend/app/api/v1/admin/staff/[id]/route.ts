import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest, context: any) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const params = await context.params;
        const data = await AdminService.getStaffMemberWithPlant(params.id);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PATCH(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const body = await req.json();
        const params = await context.params;
        const staffPayload = body.staffData || body;
        const data = await AdminService.updateStaffMember(session.sub, params.id, staffPayload);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

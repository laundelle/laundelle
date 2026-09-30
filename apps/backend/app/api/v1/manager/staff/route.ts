import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);
        const data = await ManagerService.getStaff(session.sub);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);
        const body = await req.json();
        const data = await ManagerService.createStaffMember(session.sub, body.staffData);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

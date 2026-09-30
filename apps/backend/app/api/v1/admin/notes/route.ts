import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const body = await req.json();
        
        const data = await AdminService.addNote(session.sub, body.targetType, body.targetId, body.note, body.pinned);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

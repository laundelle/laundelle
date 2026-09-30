import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function PUT(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'super_admin']);
        const body = await req.json();
        const data = await ProcessorService.updateAvailability(session.sub, body.availability);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

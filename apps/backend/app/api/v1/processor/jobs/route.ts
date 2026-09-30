import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'super_admin', 'admin', 'manager']);
        const data = await ProcessorService.getJobs(session.sub);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

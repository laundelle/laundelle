import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ExceptionService } from '@/services/ExceptionService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager', 'admin', 'super_admin']);

        const url = new URL(req.url);
        const plantId = url.searchParams.get('plantId') || undefined;

        const summary = await ExceptionService.getExceptionSummary(plantId);
        return NextResponse.json({ success: true, summary });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { MachineRunService } from '@/services/MachineRunService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);

        const body = await req.json().catch(() => ({}));
        const { notes } = body;

        const params = await context.params;
        const runId = params.id;

        const completed = await MachineRunService.completeRun(runId, session.sub, notes);
        return NextResponse.json({ success: true, run: completed });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

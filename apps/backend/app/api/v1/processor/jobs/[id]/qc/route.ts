import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'super_admin', 'admin', 'manager']);
        const body = await req.json();
        const data = await ProcessorService.recordQualityCheck(
            session.sub, 
            (await context.params).id, 
            body.status, 
            body.notes, 
            body.reason,
            body.checklist,
            body.itemChecks
        );
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

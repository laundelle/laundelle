import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync, resolveLaundelleUser } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['processor', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const processorId = String(dbUser?._id || session.sub);
        const body = await req.json();
        const data = await ProcessorService.recordQualityCheck(
            processorId, 
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

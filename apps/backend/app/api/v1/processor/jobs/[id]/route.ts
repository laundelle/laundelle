import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync, resolveLaundelleUser } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function GET(req: NextRequest, context: any) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['processor', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const processorId = String(dbUser?._id || session?.sub);
        const params = await context.params;
        const code = decodeURIComponent(params.id || '');
        const data = await ProcessorService.getOrderForIntake(code, processorId);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

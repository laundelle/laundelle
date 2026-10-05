import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function GET(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'super_admin', 'admin', 'manager']);
        const params = await context.params;
        const code = decodeURIComponent(params.id || '');
        const data = await ProcessorService.getOrderForIntake(code, session?.sub);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

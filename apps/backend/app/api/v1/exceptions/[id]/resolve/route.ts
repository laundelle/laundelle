import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ExceptionService } from '@/services/ExceptionService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager', 'admin', 'super_admin']);

        const body = await req.json();
        const { action, notes } = body;

        if (!action || !notes) {
            return NextResponse.json({ error: 'Action and explanation notes are required.' }, { status: 400 });
        }

        const params = await context.params;
        const exceptionId = params.id;

        const resolved = await ExceptionService.resolveException(
            exceptionId,
            session.sub,
            session.email || 'Manager',
            action,
            notes
        );

        return NextResponse.json({ success: true, exception: resolved });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

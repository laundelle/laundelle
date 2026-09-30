import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { IncidentService } from '@/services/IncidentService';

export async function GET(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);

        const params = await context.params;
        const incidentId = params?.id || context.params?.id;

        const data = await IncidentService.getIncidentById(session.sub, incidentId);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PATCH(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);

        const params = await context.params;
        const incidentId = params?.id || context.params?.id;
        const body = await req.json();

        if (body.note) {
            const data = await IncidentService.addInvestigationNote(session.sub, incidentId, body.note);
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'No actionable field provided.' }, { status: 400 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

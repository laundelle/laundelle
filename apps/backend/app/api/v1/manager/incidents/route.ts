import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { IncidentService } from '@/services/IncidentService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || undefined;
        const type = searchParams.get('type') || undefined;
        const priority = searchParams.get('priority') || undefined;
        const orderId = searchParams.get('orderId') || undefined;

        const data = await IncidentService.getIncidents(session.sub, {
            status,
            type,
            priority,
            orderId
        });

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager']);

        const body = await req.json();
        const data = await IncidentService.createIncident(session.sub, body);

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

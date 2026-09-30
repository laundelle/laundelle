import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { IncidentService } from '@/services/IncidentService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        const user = requireRole(req, ['manager', 'admin', 'super_admin']);

        const params = await context.params;
        const incidentId = params?.id || context.params?.id;
        const body = await req.json();

        if (!body.type || !body.explanation) {
            return NextResponse.json({ error: 'Resolution type and explanation are strictly required.' }, { status: 400 });
        }

        const data = await IncidentService.resolveIncident(
            session.sub,
            incidentId,
            {
                type: body.type,
                amount: body.amount,
                creditVoucherCode: body.creditVoucherCode,
                explanation: body.explanation
            },
            user.role
        );

        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 400 });
    }
}

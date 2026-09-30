import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { OrderService } from '@/services/OrderService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager', 'admin', 'super_admin']);

        const body = await req.json();
        const { resolutionAction, notes, adjustedAmount } = body;

        if (!resolutionAction || !notes) {
            return NextResponse.json({ error: 'resolutionAction and explanation notes are required.' }, { status: 400 });
        }

        const params = await context.params;
        const orderId = params.id;

        const result = await OrderService.resolveRejectedAdditionalCharge(
            session.sub,
            session.role || 'manager',
            orderId,
            resolutionAction,
            notes,
            adjustedAmount
        );

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

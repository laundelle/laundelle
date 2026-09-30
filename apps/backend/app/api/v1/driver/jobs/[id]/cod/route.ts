import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { CodService } from '@/services/CodService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver', 'admin', 'super_admin']);

        const body = await req.json();
        const { amountCollected, paymentMethod, receiptReference, notes } = body;

        if (typeof amountCollected !== 'number') {
            return NextResponse.json({ error: 'amountCollected is required and must be a number.' }, { status: 400 });
        }

        const params = await context.params;
        const orderId = params.id;

        const record = await CodService.recordCodCollection({
            orderId,
            driverId: session.sub,
            amountCollected,
            paymentMethod,
            receiptReference,
            notes
        });

        return NextResponse.json({ success: true, record });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver', 'admin', 'super_admin']);

        const body = await req.json();
        const { otp, pin, signatureUrl, photoUrls, recipientName, amountCollected, codPaymentMethod, location } = body;
        const verificationPin = pin || otp || '';

        const params = await context.params;
        const orderId = params.id;

        const result = await DriverService.confirmDelivery(
            session.sub, 
            orderId, 
            verificationPin, 
            signatureUrl, 
            photoUrls,
            {
                location,
                recipientName,
                amountCollected: typeof amountCollected === 'number' ? amountCollected : undefined,
                codPaymentMethod
            }
        );

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

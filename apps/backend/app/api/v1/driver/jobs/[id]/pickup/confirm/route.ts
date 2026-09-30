import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function POST(req: NextRequest, context: any) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['driver', 'admin', 'super_admin']);

        const body = await req.json();
        const { otp, pin, qrTagId, bagCount, pieceCount, photoUrls, notes, location } = body;
        const verificationPin = pin || otp;

        if (!verificationPin || !qrTagId) {
            return NextResponse.json({ error: 'Pickup PIN and QR Tag ID are required.' }, { status: 400 });
        }

        const params = await context.params;
        const orderId = params.id;

        const result = await DriverService.confirmPickup(
            session.sub, 
            orderId, 
            verificationPin, 
            qrTagId, 
            bagCount || 1, 
            photoUrls,
            {
                pieceCount: typeof pieceCount === 'number' ? pieceCount : undefined,
                location,
                notes
            }
        );

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

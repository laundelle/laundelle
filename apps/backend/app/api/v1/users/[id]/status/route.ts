import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, resolveLaundelleUser, UnauthorizedError } from '@/lib/api';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';

export async function PATCH(req: NextRequest, context: any) {
    try {
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) {
            throw new UnauthorizedError('Laundelle user profile not found.');
        }

        const params = await context.params;
        const body = await req.json();

        const data = await StaffProvisioningService.updateUserStatus(
            { token, dbUser },
            params.id,
            body
        );

        return NextResponse.json({ success: true, ...data });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';

export async function GET(req: NextRequest) {
    try {
        const context = await requirePermission(req, 'managers:read');
        const data = await StaffProvisioningService.listManagers(context);
        return NextResponse.json({ success: true, ...data });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const context = await requirePermission(req, 'managers:create');
        const body = await req.json();
        const payload = body.staffData || body;
        const data = await StaffProvisioningService.provisionManager(context, payload);
        return NextResponse.json({ success: true, ...data }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

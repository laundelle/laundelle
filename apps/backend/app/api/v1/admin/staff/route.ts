import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest) {
    try {
        const context = await requirePermission(req, 'users:read');
        const url = new URL(req.url);
        const role = url.searchParams.get('role');
        const query: any = {};
        if (role) {
            query.role = role === 'manager' ? { $in: ['manager', 'plant_manager'] } : role;
        }
        const data = await AdminService.getStaff(query);
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
        const context = await requirePermission(req, 'users:create');
        const body = await req.json();
        const staffPayload = body.staffData || body;
        const targetRole = (staffPayload.role || '').toLowerCase();

        let result;
        if (targetRole === 'manager' || targetRole === 'plant_manager') {
            result = await StaffProvisioningService.provisionManager(context, staffPayload);
        } else if (targetRole === 'driver') {
            result = await StaffProvisioningService.provisionDriver(context, staffPayload);
        } else if (targetRole === 'processor') {
            result = await StaffProvisioningService.provisionProcessor(context, staffPayload);
        } else {
            return NextResponse.json(
                { success: false, error: `Invalid staff role "${targetRole}". Must be manager, driver, or processor.` },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            staffId: result.staffId,
            publicId: result.publicId,
            ticketUrl: result.ticketUrl,
            user: result.user
        }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

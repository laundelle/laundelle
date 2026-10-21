import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, resolveLaundelleUser, UnauthorizedError, ForbiddenError } from '@/lib/api';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';
import { AdminService } from '@/services/AdminService';
import { normalizeRole } from '@laundelle/auth';

export async function GET(req: NextRequest, context: any) {
    try {
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) throw new UnauthorizedError();
        const role = normalizeRole(dbUser.role);
        if (role !== 'super_admin') {
            throw new ForbiddenError('Super Admin authorization required.');
        }

        const params = await context.params;
        const data = await AdminService.getStaffMemberWithPlant(params.id);
        return NextResponse.json({ success: true, ...data });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

export async function PATCH(req: NextRequest, context: any) {
    try {
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) throw new UnauthorizedError();
        const role = normalizeRole(dbUser.role);
        if (role !== 'super_admin') {
            throw new ForbiddenError('Super Admin authorization required.');
        }

        const body = await req.json();
        const params = await context.params;
        const staffPayload = body.staffData || body;

        const data = await StaffProvisioningService.updateUser(
            { token, dbUser },
            params.id,
            staffPayload
        );
        return NextResponse.json({ success: true, ...data });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}

export async function DELETE(req: NextRequest, context: any) {
    try {
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) throw new UnauthorizedError();
        const role = normalizeRole(dbUser.role);
        if (role !== 'super_admin' && role !== 'plant_manager') {
            throw new ForbiddenError('Super Admin or Plant Manager authorization required.');
        }

        const params = await context.params;
        const result = await StaffProvisioningService.deleteStaff(
            { token, dbUser },
            params.id
        );
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}


import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, resolveLaundelleUser, UnauthorizedError, ForbiddenError } from '@/lib/api';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';
import { ManagerService } from '@/services/ManagerService';
import { normalizeRole } from '@laundelle/auth';

export async function GET(req: NextRequest) {
    try {
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) {
            throw new UnauthorizedError('Laundelle manager profile not found.');
        }

        const role = normalizeRole(dbUser.role);
        if (role !== 'plant_manager' && role !== 'super_admin') {
            throw new ForbiddenError('Access denied: Manager authorization required.');
        }

        const data = await ManagerService.getStaff(String(dbUser._id));
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
        const token = await requireAuthAsync(req);
        const dbUser = await resolveLaundelleUser(token);
        if (!dbUser) {
            throw new UnauthorizedError('Laundelle manager profile not found.');
        }

        const role = normalizeRole(dbUser.role);
        if (role !== 'plant_manager' && role !== 'super_admin') {
            throw new ForbiddenError('Access denied: Plant Manager authorization required.');
        }

        const body = await req.json();
        const staffPayload = body.staffData || body;
        const targetRole = (staffPayload.role || '').toLowerCase();

        if (targetRole === 'manager' || targetRole === 'plant_manager') {
            return NextResponse.json(
                { success: false, error: 'Plant Managers cannot create other Managers.' },
                { status: 403 }
            );
        }

        let result;
        if (targetRole === 'driver') {
            result = await StaffProvisioningService.provisionDriver({ token, dbUser }, staffPayload);
        } else if (targetRole === 'processor') {
            result = await StaffProvisioningService.provisionProcessor({ token, dbUser }, staffPayload);
        } else {
            return NextResponse.json(
                { success: false, error: 'Plant Managers can only create Drivers or Processors.' },
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

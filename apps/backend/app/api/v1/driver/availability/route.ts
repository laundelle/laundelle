import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync, resolveLaundelleUser } from '@/lib/api';
import { DriverService } from '@/services/DriverService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['driver', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const driverId = String(dbUser?._id || session.sub);
        const { driverUser } = await DriverService.getDriverIdentifiers(driverId);
        
        if (!driverUser) {
            return NextResponse.json({ error: 'Driver profile not found.' }, { status: 404 });
        }

        const isAvailable = driverUser.status !== 'suspended' && !driverUser.is_blocked && (driverUser.availability === 'available' || (driverUser.availability !== 'off-duty' && driverUser.availability !== 'offline'));
        return NextResponse.json({
            success: true,
            isAvailable,
            availability: driverUser.availability || (isAvailable ? 'available' : 'off-duty'),
            is_active: true
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

export async function PUT(req: NextRequest) {
    return handleUpdate(req);
}

export async function POST(req: NextRequest) {
    return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['driver', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const driverId = String(dbUser?._id || session.sub);

        const body = await req.json();
        let isAvailable = true;
        if (typeof body.isAvailable === 'boolean') {
            isAvailable = body.isAvailable;
        } else if (typeof body.availability === 'string') {
            isAvailable = body.availability === 'available';
        } else if (typeof body.is_active === 'boolean') {
            isAvailable = body.is_active;
        }

        const result = await DriverService.updateAvailability(driverId, isAvailable);
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

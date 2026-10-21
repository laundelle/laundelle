import { NextRequest, NextResponse } from 'next/server';
import {
    requireAuthAsync,
    resolveLaundelleUser,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    BadRequestError,
    assertPlantIsolation
} from '@/lib/api';
import { getDb } from '@/lib/mongodb';
import { normalizeRole } from '@laundelle/auth';
import { StaffProvisioningService } from '@/services/StaffProvisioningService';
import { UserService } from '@/services/UserService';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest, context: any) {
    try {
        const token = await requireAuthAsync(req);
        const authUser = await resolveLaundelleUser(token);
        if (!authUser) {
            throw new UnauthorizedError('Laundelle user profile not found.');
        }

        const params = await context.params;
        const requestedId = params?.id;
        if (!requestedId) {
            throw new BadRequestError('User ID is required.');
        }

        const db = await getDb();
        const targetUser = await db.collection('users').findOne(UserService.buildUserFilter(requestedId));
        if (!targetUser) {
            throw new NotFoundError('User not found.');
        }

        const isSelf = Boolean(
            String(targetUser._id) === String(authUser._id) ||
            (authUser.publicId && targetUser.publicId === authUser.publicId) ||
            (authUser.customerId && targetUser.customerId === authUser.customerId) ||
            (authUser.id && targetUser.id === authUser.id) ||
            (authUser.auth0UserId && targetUser.auth0UserId === authUser.auth0UserId) ||
            (authUser.auth0_sub && targetUser.auth0_sub === authUser.auth0_sub)
        );

        if (!isSelf) {
            const actorRole = normalizeRole(authUser.role);
            if (actorRole === 'super_admin') {
                // Super Admin has authorized administrative access
            } else if (actorRole === 'plant_manager') {
                assertPlantIsolation(authUser, targetUser.plant_id || targetUser.plantId, targetUser);
            } else {
                throw new ForbiddenError('Access denied: You do not have permission to view this user profile.');
            }
        }

        const profile = await UserService.getProfile(String(targetUser._id));
        return NextResponse.json({ success: true, user: profile, data: profile });
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
        if (!dbUser) {
            throw new UnauthorizedError('Laundelle user profile not found.');
        }

        const params = await context.params;
        const requestedId = params?.id;
        if (!requestedId) {
            throw new BadRequestError('User ID is required.');
        }

        const db = await getDb();
        const targetUser = await db.collection('users').findOne(UserService.buildUserFilter(requestedId));
        if (!targetUser) {
            throw new NotFoundError('User not found.');
        }

        const actorRole = normalizeRole(dbUser.role);
        const isSelf = Boolean(
            String(targetUser._id) === String(dbUser._id) ||
            (dbUser.publicId && targetUser.publicId === dbUser.publicId) ||
            (dbUser.customerId && targetUser.customerId === dbUser.customerId) ||
            (dbUser.id && targetUser.id === dbUser.id) ||
            (dbUser.auth0UserId && targetUser.auth0UserId === dbUser.auth0UserId) ||
            (dbUser.auth0_sub && targetUser.auth0_sub === dbUser.auth0_sub)
        );

        const body = await req.json();

        if (actorRole === 'super_admin' || actorRole === 'plant_manager') {
            const payload = body.staffData || body;
            const data = await StaffProvisioningService.updateUser(
                { token, dbUser },
                String(targetUser._id),
                payload
            );
            return NextResponse.json({ success: true, ...data });
        }

        if (isSelf) {
            const allowedUpdates: any = {};
            if (body.name || body.full_name) allowedUpdates.name = body.name || body.full_name;
            if (body.phone) allowedUpdates.phone = body.phone;
            const updated = await UserService.updateProfile(String(targetUser._id), allowedUpdates);
            return NextResponse.json({ success: true, user: updated, data: updated });
        }

        throw new ForbiddenError('Access denied: You do not have permission to update this user profile.');
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
        if (!dbUser) {
            throw new UnauthorizedError('Laundelle user profile not found.');
        }

        const params = await context.params;
        const requestedId = params?.id;
        if (!requestedId) {
            throw new BadRequestError('User ID is required.');
        }

        const db = await getDb();
        const targetUser = await db.collection('users').findOne(UserService.buildUserFilter(requestedId));
        if (!targetUser) {
            throw new NotFoundError('User not found.');
        }

        const actorRole = normalizeRole(dbUser.role);
        const isSelf = Boolean(
            String(targetUser._id) === String(dbUser._id) ||
            (dbUser.publicId && targetUser.publicId === dbUser.publicId) ||
            (dbUser.customerId && targetUser.customerId === dbUser.customerId) ||
            (dbUser.id && targetUser.id === dbUser.id) ||
            (dbUser.auth0UserId && targetUser.auth0UserId === dbUser.auth0UserId) ||
            (dbUser.auth0_sub && targetUser.auth0_sub === dbUser.auth0_sub)
        );

        const isStaff = ['super_admin', 'admin', 'plant_manager', 'driver', 'processor'].includes(targetUser.role);

        if (actorRole === 'super_admin' || actorRole === 'plant_manager') {
            if (isStaff) {
                const res = await StaffProvisioningService.deleteStaff({ token, dbUser }, String(targetUser._id));
                return NextResponse.json(res);
            } else {
                const res = await AdminService.deleteCustomer(String(dbUser._id), String(targetUser._id));
                return NextResponse.json(res);
            }
        }

        if (isSelf) {
            if (isStaff) {
                throw new ForbiddenError('Staff members cannot self-delete accounts. Please contact a Super Administrator.');
            }
            const res = await AdminService.deleteCustomer(String(dbUser._id), String(targetUser._id));
            return NextResponse.json(res);
        }

        throw new ForbiddenError('Access denied: You do not have permission to delete this user.');
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e.message, code: e.code || 'BAD_REQUEST' },
            { status: e.status || 400 }
        );
    }
}


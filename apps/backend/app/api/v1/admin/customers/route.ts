import { NextRequest, NextResponse } from 'next/server';
import { requireRoleAsync, withErrorHandler, BadRequestError } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

async function getAdminCustomersHandler(req: NextRequest) {
    // Only administrators and super administrators have authorization to query global customer profiles
    await requireRoleAsync(req, ['admin', 'super_admin']);
    const url = new URL(req.url);
    const search = url.searchParams.get('search') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const page = parseInt(url.searchParams.get('page') || '1', 10);

    const data = await AdminService.getCustomers(search, status, limit, page);
    return NextResponse.json(data);
}

async function postAdminCustomersHandler(req: NextRequest) {
    const user = await requireRoleAsync(req, ['admin', 'super_admin']);
    const { resolveLaundelleUser } = await import('@/lib/api');
    const dbUser = await resolveLaundelleUser(user);
    const adminName = dbUser?.full_name || dbUser?.name || user.name || 'Admin';
    const actorId = String(dbUser?._id || dbUser?.publicId || user.sub);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'flag') {
        const res = await AdminService.addCustomerFlag(actorId, adminName, body.flagData);
        return NextResponse.json(res);
    } else if (action === 'note') {
        const res = await AdminService.addCustomerNote(
            actorId,
            adminName,
            user.role || 'Super Admin',
            body.customerId,
            body.note
        );
        return NextResponse.json(res);
    } else if (action === 'status') {
        const res = await AdminService.updateCustomerStatus(actorId, body.customerId, body.status);
        return NextResponse.json(res);
    } else {
        throw new BadRequestError('Invalid administrative customer action.');
    }
}

export const GET = withErrorHandler(getAdminCustomersHandler);
export const POST = withErrorHandler(postAdminCustomersHandler);

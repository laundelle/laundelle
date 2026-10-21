import { NextRequest, NextResponse } from 'next/server';
import { requireRoleAsync, withErrorHandler, BadRequestError } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

async function deleteAdminCustomerHandler(req: NextRequest, context: any) {
    const user = await requireRoleAsync(req, ['admin', 'super_admin']);
    const { resolveLaundelleUser } = await import('@/lib/api');
    const dbUser = await resolveLaundelleUser(user);
    const actorId = String(dbUser?._id || dbUser?.publicId || user.sub);

    const params = await context.params;
    const customerId = params?.id;
    if (!customerId) {
        throw new BadRequestError('Customer ID is required.');
    }

    const res = await AdminService.deleteCustomer(actorId, customerId);
    return NextResponse.json(res);
}

export const DELETE = withErrorHandler(deleteAdminCustomerHandler);

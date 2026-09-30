import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { UserService } from '@/services/UserService';

async function updateAddressHandler(req: NextRequest, context: any) {
    const user = requireAuth(req);
    // Extract route parameters. Note context is destructured differently in Next.js 13+
    const params = await context.params;
    const addressId = params.id;
    const body = await req.json();
    
    const result = await UserService.updateAddress(user.sub, addressId, body);
    return successResponse(result);
}

async function deleteAddressHandler(req: NextRequest, context: any) {
    const user = requireAuth(req);
    const params = await context.params;
    const addressId = params.id;
    
    const result = await UserService.deleteAddress(user.sub, addressId);
    return successResponse(result);
}

export const PATCH = withErrorHandler(updateAddressHandler);
export const DELETE = withErrorHandler(deleteAddressHandler);

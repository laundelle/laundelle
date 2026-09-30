import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth } from '@/lib/api';
import { UserService } from '@/services/UserService';

async function addAddressHandler(req: NextRequest) {
    const user = requireAuth(req);
    const body = await req.json();
    const result = await UserService.addAddress(user.sub, body);
    return successResponse(result, 201);
}

export const POST = withErrorHandler(addAddressHandler);

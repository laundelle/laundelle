import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { AuthService } from '@/services/AuthService';

async function signupHandler(req: NextRequest) {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    
    const result = await AuthService.signUp(body, clientIp);
    return successResponse(result, 201); // 201 Created
}

export const POST = withErrorHandler(signupHandler);

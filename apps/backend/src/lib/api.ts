import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt, verifyJwtAsync, syncRevokedTokens, JwtPayload } from './auth';

// ---------------------------------------------------------------------------
// Standard API Responses
// ---------------------------------------------------------------------------

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

import { corsHeaders } from './cors';

export function successResponse<T>(data: T, status: number = 200, additionalHeaders?: HeadersInit) {
    return NextResponse.json({ success: true, data }, { 
        status,
        headers: {
            ...corsHeaders,
            ...(additionalHeaders as Record<string, string> || {}),
        }
    });
}

export function errorResponse(code: string, message: string, status: number = 400, details?: any, additionalHeaders?: HeadersInit) {
    return NextResponse.json({
        success: false,
        error: { code, message, details }
    }, { 
        status,
        headers: {
            ...corsHeaders,
            ...(additionalHeaders as Record<string, string> || {}),
        }
    });
}

// ---------------------------------------------------------------------------
// HTTP Error Class for Service Layer
// ---------------------------------------------------------------------------

export class ApiError extends Error {
    public code: string;
    public status: number;
    public details?: any;

    constructor(message: string, code: string = 'INTERNAL_ERROR', status: number = 500, details?: any) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        this.details = details;
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Authentication required') {
        super(message, 'UNAUTHORIZED', 401);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Access denied') {
        super(message, 'FORBIDDEN', 403);
    }
}

export class NotFoundError extends ApiError {
    constructor(message: string = 'Resource not found') {
        super(message, 'NOT_FOUND', 404);
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string = 'Bad request', details?: any) {
        super(message, 'BAD_REQUEST', 400, details);
    }
}

// ---------------------------------------------------------------------------
// JWT Extraction Helper
// ---------------------------------------------------------------------------

export function getAuthenticatedUser(req: NextRequest): JwtPayload | null {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return verifyJwt(token);
    }
    // Cookie-based session extraction fallback
    const cookieToken = req.cookies.get('laundelle_token')?.value || req.cookies.get('l2u_token')?.value;
    if (cookieToken) {
        return verifyJwt(cookieToken);
    }
    return null;
}

export async function getAuthenticatedUserAsync(req: NextRequest): Promise<JwtPayload | null> {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        return verifyJwtAsync(token);
    }
    const cookieToken = req.cookies.get('laundelle_token')?.value || req.cookies.get('l2u_token')?.value;
    if (cookieToken) {
        return verifyJwtAsync(cookieToken);
    }
    return null;
}

export function requireAuth(req: NextRequest): JwtPayload {
    const user = getAuthenticatedUser(req);
    if (!user) {
        throw new UnauthorizedError();
    }
    return user;
}

export async function requireAuthAsync(req: NextRequest): Promise<JwtPayload> {
    const user = await getAuthenticatedUserAsync(req);
    if (!user) {
        throw new UnauthorizedError();
    }
    return user;
}

export function requireRole(req: NextRequest, allowedRoles: string[]): JwtPayload {
    const user = requireAuth(req);
    if (!user.role || !allowedRoles.includes(user.role)) {
        throw new ForbiddenError(`Role ${user.role || 'none'} is not authorized`);
    }
    return user;
}

export async function requireRoleAsync(req: NextRequest, allowedRoles: string[]): Promise<JwtPayload> {
    const user = await requireAuthAsync(req);
    if (!user.role || !allowedRoles.includes(user.role)) {
        throw new ForbiddenError(`Role ${user.role || 'none'} is not authorized`);
    }
    return user;
}

// ---------------------------------------------------------------------------
// Error Handler Wrapper for Route Handlers
// ---------------------------------------------------------------------------

export function withErrorHandler(handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>) {
    return async (req: NextRequest, ...args: any[]) => {
        try {
            await syncRevokedTokens().catch(() => {});
            return await handler(req, ...args);
        } catch (error: any) {
            console.error('[API Error]:', error);
            if (error instanceof ApiError) {
                return errorResponse(error.code, error.message, error.status, error.details);
            }
            // Do not leak stack traces or raw errors
            return errorResponse('INTERNAL_SERVER_ERROR', 'An unexpected server error occurred', 500);
        }
    };
}

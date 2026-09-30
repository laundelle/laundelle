import { NextRequest } from 'next/server';
import { requireAuth, successResponse, withErrorHandler } from '@/lib/api';
import { SupportService } from '@/services/SupportService';

export const GET = withErrorHandler(async (req: NextRequest) => {
    const session = requireAuth(req);
    const tickets = await SupportService.getTickets(session.sub, session.role);
    return successResponse({ tickets });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
    const session = requireAuth(req);
    const body = await req.json();

    const result = await SupportService.createTicket(session.sub, body.ticket);
    return successResponse(result);
});

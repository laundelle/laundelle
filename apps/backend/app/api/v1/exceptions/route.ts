import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ExceptionService } from '@/services/ExceptionService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager', 'admin', 'super_admin']);

        const url = new URL(req.url);
        const plantId = url.searchParams.get('plantId') || undefined;
        const status = (url.searchParams.get('status') as any) || undefined;
        const priority = (url.searchParams.get('priority') as any) || undefined;
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        const result = await ExceptionService.getExceptions({
            plantId,
            status,
            priority,
            page,
            limit
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'driver', 'manager', 'admin', 'super_admin']);

        const body = await req.json();
        const { orderId, orderNumber, type, priority, plantId, description, evidence } = body;

        if (!orderId || !type || !description) {
            return NextResponse.json({ error: 'orderId, type, and description are required.' }, { status: 400 });
        }

        const newEx = await ExceptionService.createException({
            orderId,
            orderNumber,
            type,
            priority,
            plantId,
            description,
            evidence
        });

        return NextResponse.json({ success: true, exception: newEx }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

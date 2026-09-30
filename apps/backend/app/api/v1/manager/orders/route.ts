import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['manager', 'admin', 'super_admin']);
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const status = url.searchParams.get('status') || undefined;
        const targetManagerId = (session.role === 'manager') ? session.sub : (url.searchParams.get('managerId') || session.sub);

        const data = await ManagerService.getOrders(targetManagerId, limit, page, status);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

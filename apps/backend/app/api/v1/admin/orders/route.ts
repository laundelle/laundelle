import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const status = url.searchParams.get('status') || undefined;
        
        if (session.role === 'manager') {
            const data = await ManagerService.getOrders(session.sub, limit, page, status);
            return NextResponse.json(data);
        }

        const query: any = {};
        if (status) query.status = status;
        else query.status = { $ne: 'pending_payment' };

        const data = await AdminService.getOrders(query, limit, page);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

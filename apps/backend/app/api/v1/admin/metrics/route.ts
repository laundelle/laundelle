import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        if (session.role === 'manager') {
            const data = await ManagerService.getDashboardMetrics(session.sub);
            return NextResponse.json(data);
        }
        const location = req.nextUrl.searchParams.get('location') || undefined;
        const data = await AdminService.getDashboardMetrics(location);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

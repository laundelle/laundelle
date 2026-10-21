import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['manager', 'plant_manager', 'admin', 'super_admin']);
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const status = url.searchParams.get('status') || undefined;
        const dateFilter = url.searchParams.get('dateFilter') || undefined;
        const startDate = url.searchParams.get('startDate') || undefined;
        const endDate = url.searchParams.get('endDate') || undefined;
        const normRole = (session.role || '').toLowerCase();
        const targetManagerId = (normRole === 'manager' || normRole === 'plant_manager') ? session.sub : (url.searchParams.get('managerId') || session.sub);

        const data = await ManagerService.getOrders(targetManagerId, limit, page, status, dateFilter, startDate, endDate);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

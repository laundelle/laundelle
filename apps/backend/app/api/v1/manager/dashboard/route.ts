import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync, resolveLaundelleUser } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['manager', 'plant_manager', 'admin', 'super_admin']);
        const dbUser = await resolveLaundelleUser(session);

        const { searchParams } = new URL(req.url);
        const normRole = (session.role || dbUser?.role || '').toLowerCase();
        const isManager = normRole === 'manager' || normRole === 'plant_manager';
        const queryManagerId = searchParams.get('managerId');
        const targetManagerId = isManager
            ? (dbUser ? String(dbUser._id) : session.sub)
            : (queryManagerId || (dbUser ? String(dbUser._id) : session.sub));

        const dateFilter = searchParams.get('dateFilter') || undefined;
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;

        const data = await ManagerService.getDashboardMetrics(targetManagerId, dateFilter, startDate, endDate);
        return NextResponse.json({ success: true, ...data, data });
    } catch (e: any) {
        console.error('[Manager Dashboard Route Error]:', e);
        return NextResponse.json({ error: e.message, success: false }, { status: 400 });
    }
}

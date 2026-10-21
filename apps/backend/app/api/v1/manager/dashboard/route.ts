import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithUser, requireRoleAsync } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const { token, dbUser } = await requireAuthWithUser(req);
        await requireRoleAsync(req, ['manager', 'plant_manager']);
        const managerId = String(dbUser._id || dbUser.publicId || token.sub);
        const { searchParams } = new URL(req.url);
        const dateFilter = searchParams.get('dateFilter') || undefined;
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;
        const data = await ManagerService.getDashboardMetrics(managerId, dateFilter, startDate, endDate);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

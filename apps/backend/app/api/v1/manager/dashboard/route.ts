import { NextRequest, NextResponse } from 'next/server';
import { requireAuthWithUser, requireRole } from '@/lib/api';
import { ManagerService } from '@/services/ManagerService';

export async function GET(req: NextRequest) {
    try {
        const { token, dbUser } = await requireAuthWithUser(req);
        requireRole(req, ['manager']);
        const managerId = String(dbUser._id || dbUser.publicId || token.sub);
        const data = await ManagerService.getDashboardMetrics(managerId);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

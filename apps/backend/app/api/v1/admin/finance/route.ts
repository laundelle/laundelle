import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const data = await AdminService.getFinanceData();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

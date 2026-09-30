import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin']);
        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '100', 10);
        const logs = await AdminService.getAuditLogs(limit);
        return NextResponse.json({ logs });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { AdminService } from '@/services/AdminService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const url = new URL(req.url);
        const search = url.searchParams.get('search') || undefined;
        const status = url.searchParams.get('status') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const page = parseInt(url.searchParams.get('page') || '1', 10);

        const data = await AdminService.getCustomers(search, status, limit, page);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const body = await req.json();
        const { action } = body;

        let adminName = 'Admin';
        try {
            const db = await (await import('@/lib/mongodb')).getDb();
            const staffUser = await db.collection('users').findOne({ _id: user.sub } as any);
            if (staffUser?.full_name) {
                adminName = staffUser.full_name;
            }
        } catch {
            // fallback if lookup fails
        }

        if (action === 'flag') {
            const res = await AdminService.addCustomerFlag(user.sub, adminName, body.flagData);
            return NextResponse.json(res);
        } else if (action === 'note') {
            const res = await AdminService.addCustomerNote(
                user.sub,
                adminName,
                user.role || 'Super Admin',
                body.customerId,
                body.note
            );
            return NextResponse.json(res);
        } else if (action === 'status') {
            const res = await AdminService.updateCustomerStatus(user.sub, body.customerId, body.status);
            return NextResponse.json(res);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

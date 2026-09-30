import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, ForbiddenError } from '@/lib/api';

export async function PATCH(req: NextRequest) {
    try {
        await requireAuth(req);
        // Direct status overrides (admin_status_override) are strictly restricted to Admin
        throw new ForbiddenError('Access Denied: Admin authorization required for direct status override');
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: e.status || 403 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { CodService } from '@/services/CodService';

export async function GET(req: NextRequest) {
    try {
        await requireAuth(req);
        requireRole(req, ['admin', 'super_admin', 'manager']);
        const records = await CodService.getCodRecords({}, 100);
        const totalExpected = records.reduce((sum, r) => sum + (r.amountExpected || 0), 0);
        const totalCollected = records.reduce((sum, r) => sum + (r.amountCollected || 0), 0);
        const totalDiscrepancy = records.reduce((sum, r) => sum + (r.discrepancyAmount || 0), 0);
        const discrepancyCount = records.filter(r => r.reconciliationStatus === 'DISCREPANCY').length;

        return NextResponse.json({
            success: true,
            records,
            summary: {
                totalOrders: records.length,
                totalExpected,
                totalCollected,
                totalDiscrepancy,
                discrepancyCount
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

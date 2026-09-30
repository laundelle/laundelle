import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api';
import { MachineRunService } from '@/services/MachineRunService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);

        const url = new URL(req.url);
        const plantId = url.searchParams.get('plantId');
        if (!plantId) {
            return NextResponse.json({ error: 'plantId query parameter is required.' }, { status: 400 });
        }

        const activeRuns = await MachineRunService.getActiveRunsForPlant(plantId);
        return NextResponse.json({ success: true, runs: activeRuns });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await requireAuth(req);
        requireRole(req, ['processor', 'manager', 'admin', 'super_admin']);

        const body = await req.json();
        const { machineId, plantId, orderIds, orderItemIds, cycleType, temperature, durationMinutes, notes } = body;

        if (!machineId || !plantId || !orderIds || orderIds.length === 0) {
            return NextResponse.json({ error: 'machineId, plantId, and orderIds are required.' }, { status: 400 });
        }

        const run = await MachineRunService.startRun({
            machineId,
            plantId,
            processorId: session.sub,
            processorName: session.email || 'Processor',
            orderIds,
            orderItemIds,
            cycleType: cycleType || 'Eco Wash 40°C',
            temperature,
            durationMinutes,
            notes
        });

        return NextResponse.json({ success: true, run }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: err.status || 400 });
    }
}

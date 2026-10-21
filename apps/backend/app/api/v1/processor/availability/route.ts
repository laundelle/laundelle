import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAsync, requireRoleAsync, resolveLaundelleUser } from '@/lib/api';
import { ProcessorService } from '@/services/ProcessorService';

export async function GET(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['processor', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const processorId = String(dbUser?._id || session.sub);
        const processor = await ProcessorService.findProcessorUser(processorId);
        
        if (!processor) {
            return NextResponse.json({ error: 'Processor profile not found.' }, { status: 404 });
        }

        const isAvailable = processor.status !== 'suspended' && !processor.is_blocked && processor.availability === 'available';
        return NextResponse.json({
            success: true,
            isAvailable,
            availability: processor.availability || 'available',
            is_active: true
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

export async function PUT(req: NextRequest) {
    return handleUpdate(req);
}

export async function POST(req: NextRequest) {
    return handleUpdate(req);
}

async function handleUpdate(req: NextRequest) {
    try {
        const session = await requireAuthAsync(req);
        await requireRoleAsync(req, ['processor', 'super_admin', 'admin', 'manager', 'plant_manager']);
        const dbUser = await resolveLaundelleUser(session);
        const processorId = String(dbUser?._id || session.sub);
        const body = await req.json();

        let availability: 'available' | 'busy' | 'offline' = 'available';
        if (typeof body.availability === 'string') {
            availability = body.availability;
        } else if (typeof body.isAvailable === 'boolean') {
            availability = body.isAvailable ? 'available' : 'offline';
        } else if (typeof body.is_active === 'boolean') {
            availability = body.is_active ? 'available' : 'offline';
        }

        const data = await ProcessorService.updateAvailability(processorId, availability);
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
    }
}

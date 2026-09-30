import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireRole, BadRequestError } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function updatePostcodeHandler(req: NextRequest, context: any) {
    const user = requireRole(req, ['admin']);
    const params = await context.params;
    // Expected id format: "DISTRICT-SECTOR", e.g. "AB1-2" -> district "AB1", sector "2"
    const id = params.id;
    if (!id || !id.includes('-')) {
        throw new BadRequestError('Invalid postcode ID format. Expected DISTRICT-SECTOR.');
    }
    const [district, sector] = id.split('-');
    
    const body = await req.json();
    const result = await PlatformService.updatePostcode(user.sub, district, sector, body);
    return successResponse(result);
}

export const PATCH = withErrorHandler(updatePostcodeHandler);

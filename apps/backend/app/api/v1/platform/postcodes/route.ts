import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function getPostcodesHandler(_req: NextRequest) {
    const districts = await PlatformService.getActiveDistricts();
    return successResponse({ districts });
}

export const GET = withErrorHandler(getPostcodesHandler);

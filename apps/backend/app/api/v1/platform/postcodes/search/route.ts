import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function searchPostcodesHandler(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const districts = await PlatformService.searchPostcodeDistricts(query);
    return successResponse({ districts });
}

export const GET = withErrorHandler(searchPostcodesHandler);

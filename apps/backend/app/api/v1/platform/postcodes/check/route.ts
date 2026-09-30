import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/api';
import { PlatformService } from '@/services/PlatformService';

async function checkPostcodeHandler(req: NextRequest) {
    let postcode = '';
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            postcode = body.postcode || '';
        } catch {
            postcode = '';
        }
    } else {
        const { searchParams } = new URL(req.url);
        postcode = searchParams.get('postcode') || '';
    }
    const result = await PlatformService.checkPostcode(postcode);
    return successResponse(result);
}

export const POST = withErrorHandler(checkPostcodeHandler);
export const GET = withErrorHandler(checkPostcodeHandler);

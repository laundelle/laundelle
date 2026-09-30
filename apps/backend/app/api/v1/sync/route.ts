import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, BadRequestError } from '@/lib/api';
import { OfflineSyncService } from '@/services/OfflineSyncService';

export const POST = withErrorHandler(async (req: NextRequest) => {
  requireAuth(req);
  const body = await req.json();

  if (!body.deviceId || !Array.isArray(body.operations)) {
    throw new BadRequestError('deviceId and operations array are required for sync.');
  }

  const result = await OfflineSyncService.processSyncBatch({
    deviceId: body.deviceId,
    operations: body.operations,
    lastSyncSequence: body.lastSyncSequence
  });

  return successResponse(result);
});

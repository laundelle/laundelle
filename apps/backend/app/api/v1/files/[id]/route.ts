import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse, getAuthenticatedUser, UnauthorizedError, BadRequestError } from '@/lib/api';
import { FileStorageService } from '@/services/FileStorageService';

export const GET = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id: fileId } = await params;
  if (!fileId) throw new BadRequestError('File ID is required.');

  // Check signed token query parameter or Authorization Bearer header / cookie
  const signedToken = req.nextUrl.searchParams.get('token');
  let requester: { id: string; role: string; plantId?: string };

  if (signedToken) {
    const verified = FileStorageService.verifySignedToken(signedToken);
    if (!verified.valid || verified.fileId !== fileId) {
      throw new UnauthorizedError('Invalid or expired signed file access token.');
    }
    requester = { id: verified.userId || 'anon', role: 'customer' };
  } else {
    const authUser = getAuthenticatedUser(req);
    if (!authUser) {
      throw new UnauthorizedError('Authentication or signed access token required to view file.');
    }
    requester = { id: authUser.sub, role: authUser.role || 'customer', plantId: authUser.plant_id };
  }

  const file = await FileStorageService.getFile(fileId, requester);

  // Return file metadata or stream representation
  return successResponse({
    fileId: file.fileId,
    orderId: file.orderId,
    fileType: file.fileType,
    mimeType: file.mimeType,
    size: file.size,
    checksum: file.checksum,
    url: file.url,
    uploadedAt: file.uploadedAt,
    status: file.status
  });
});

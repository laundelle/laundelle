import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, BadRequestError } from '@/lib/api';
import { OfflineSyncService } from '@/services/OfflineSyncService';

export const POST = withErrorHandler(async (req: NextRequest) => {
  requireAuth(req);
  const body = await req.json();

  if (body.action === 'GENERATE') {
    if (!body.orderId || !body.deviceId || !body.pin) {
      throw new BadRequestError('orderId, deviceId, and pin are required to generate offline PIN voucher.');
    }

    const voucher = OfflineSyncService.generateOfflinePinVoucher({
      orderId: body.orderId,
      deviceId: body.deviceId,
      plainPin: body.pin,
      validityHours: body.validityHours
    });

    return successResponse({ voucher }, 201);
  } else if (body.action === 'VERIFY') {
    if (!body.voucher || !body.enteredPin) {
      throw new BadRequestError('voucher and enteredPin are required for offline PIN verification.');
    }

    const isValid = OfflineSyncService.verifyOfflinePinVoucher(body.voucher, body.enteredPin);
    return successResponse({ valid: isValid });
  } else {
    throw new BadRequestError('Invalid action. Expected GENERATE or VERIFY.');
  }
});

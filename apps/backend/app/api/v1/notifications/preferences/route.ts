import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuthWithUser } from '@/lib/api';
import { getDb } from '@/lib/mongodb';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { dbUser } = await requireAuthWithUser(req);

  const preferences = dbUser?.preferences || {
    smsNotifications: true,
    emailReceipts: true,
    whatsappUpdates: true,
    marketingEmails: false
  };

  return successResponse({
    preferences,
    mandatoryNotifications: [
      'Booking Confirmation',
      'Payment Receipts',
      'Surcharge Requests',
      'Failed Collection / Delivery Alerts',
      'Delivery Confirmation & Doorstep Photo',
      'Security Alerts'
    ]
  });
});

export const PUT = withErrorHandler(async (req: NextRequest) => {
  const { dbUser } = await requireAuthWithUser(req);
  const body = await req.json();
  const db = await getDb();

  // Allow toggles but mandatory notifications will remain protected server-side in NotificationService
  const safeUpdates = {
    'preferences.smsNotifications': Boolean(body.smsNotifications),
    'preferences.emailReceipts': Boolean(body.emailReceipts),
    'preferences.whatsappUpdates': Boolean(body.whatsappUpdates),
    'preferences.marketingEmails': Boolean(body.marketingEmails),
    updated_at: new Date().toISOString()
  };

  await db.collection('users').updateOne(
    { _id: dbUser._id },
    { $set: safeUpdates }
  );

  return successResponse({ success: true, preferences: body });
});

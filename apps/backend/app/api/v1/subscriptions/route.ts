import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse, requireAuth, BadRequestError } from '@/lib/api';
import { SubscriptionService } from '@/services/SubscriptionService';

export const GET = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const subscription = await SubscriptionService.getCustomerSubscription(user.sub);
  const plans = SubscriptionService.getPlans();
  return successResponse({ subscription, plans });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const body = await req.json();
  const { planId, pickupDayOfWeek, pickupSlot, pickupAddressId } = body;

  if (!planId) throw new BadRequestError('planId is required.');

  const subscription = await SubscriptionService.createSubscription({
    customerId: user.sub,
    customerEmail: user.email,
    planId,
    pickupDayOfWeek,
    pickupSlot,
    pickupAddressId
  });

  return successResponse({ subscription }, 201);
});

export const PATCH = withErrorHandler(async (req: NextRequest) => {
  const user = requireAuth(req);
  const body = await req.json();
  const { subscriptionId, action } = body;

  if (!subscriptionId || !action) {
    throw new BadRequestError('subscriptionId and action (pause, resume, cancel) are required.');
  }

  let updated;
  if (action === 'pause') {
    updated = await SubscriptionService.pauseSubscription(subscriptionId, user.sub);
  } else if (action === 'resume') {
    updated = await SubscriptionService.resumeSubscription(subscriptionId, user.sub);
  } else if (action === 'cancel') {
    updated = await SubscriptionService.cancelSubscription(subscriptionId, user.sub);
  } else {
    throw new BadRequestError(`Unknown action '${action}'. Supported: pause, resume, cancel.`);
  }

  return successResponse({ subscription: updated });
});

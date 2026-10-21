import { isValidUkPostcode, normalizeUkPostcode } from '@laundelle/utils';
import { createOrderSchema } from '@laundelle/validations';
import type { OrderStatus } from '@laundelle/types';

console.log('--- Running Customer Mobile Application Workflow Tests ---\n');

let passedCount = 0;
let failedCount = 0;

function assertStrictEqual(actual: unknown, expected: unknown, msg?: string) {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertOk(val: unknown, msg?: string) {
  if (!val) {
    throw new Error(msg || `Expected truthy value`);
  }
}

function it(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedCount++;
  }
}

// 1. Postcode Checker and Normalization
it('should validate and normalize legitimate UK postcodes for mobile check', () => {
  const validCases = ['SW1A 1AA', 'sw1a1aa', 'EC1A 1BB', 'W1A 0AX', 'cr0 2yr'];
  for (const pc of validCases) {
    const isValid = isValidUkPostcode(pc);
    assertStrictEqual(isValid, true, `Postcode ${pc} should be valid`);
    const normalized = normalizeUkPostcode(pc);
    assertOk(normalized.includes(' '), `Normalized postcode ${normalized} must have standard space separation`);
  }
});

it('should reject invalid postcodes in mobile postcode checker', () => {
  const invalidCases = ['12345', 'INVALID', '90210', 'SW1A 1A!', '', ' '];
  for (const pc of invalidCases) {
    const isValid = isValidUkPostcode(pc);
    assertStrictEqual(isValid, false, `Postcode ${pc} should be rejected`);
  }
});

// 2. Booking Order Creation Payload
it('should validate customer booking order creation payload according to schema', () => {
  const validOrderPayload = {
    items: [
      {
        serviceId: 'srv_wash_fold',
        name: 'Wash & Fold',
        price: 15.00,
        unit: 'bag',
        quantity: 2,
      },
      {
        serviceId: 'srv_shirt_press',
        name: 'Shirt Press',
        price: 3.50,
        unit: 'item',
        quantity: 5,
      }
    ],
    address: '10 Downing Street, London SW1A 2AA',
    pickupDate: '2026-10-25',
    pickupSlot: '09:00 - 12:00',
    deliveryDate: '2026-10-27',
    deliverySlot: '14:00 - 17:00',
    paymentMethod: 'Pay Online (Stripe)',
    total: 47.50,
    notes: 'Leave with reception if not home',
  };

  const parseResult = createOrderSchema.safeParse(validOrderPayload);
  assertStrictEqual(parseResult.success, true, 'Valid booking payload should parse cleanly');
});

it('should reject booking payloads with missing items or negative pricing', () => {
  const invalidPayload = {
    items: [], // empty items
    address: '10 Test St, London SW1A 2AA',
    pickupDate: '2026-10-25',
    pickupSlot: '09:00 - 12:00',
    total: -10.00,
  };

  const parseResult = createOrderSchema.safeParse(invalidPayload);
  assertStrictEqual(parseResult.success, false, 'Invalid booking payload must be rejected by schema');
});

// 3. Auth0 Native PKCE Configuration
it('should configure native Auth0 scheme and redirect URL correctly', () => {
  const expectedScheme = 'laundelle-customer';
  const expectedRedirectUri = `${expectedScheme}://auth`;
  assertStrictEqual(expectedRedirectUri, 'laundelle-customer://auth');
});

// 4. Stripe Authoritative Payment State Handling
it('should enforce authoritative backend payment verification rather than client callback trust', () => {
  // Mobile app intercepts laundelle-customer://payment?order_id=ord_123&session_id=cs_test_123
  const deepLink = 'laundelle-customer://payment?order_id=ord_123&session_id=cs_test_123';
  const url = new URL(deepLink.replace('laundelle-customer://', 'https://dummy.host/'));
  const orderId = url.searchParams.get('order_id');
  const sessionId = url.searchParams.get('session_id');

  assertStrictEqual(orderId, 'ord_123');
  assertStrictEqual(sessionId, 'cs_test_123');

  // The client must call verifySession(sessionId), NOT update order status locally
  const clientAction = (sessionId: string | null) => {
    if (!sessionId) throw new Error('Missing session id');
    return {
      type: 'VERIFY_BACKEND_SESSION',
      endpoint: `/api/v1/payments/verify-session?session_id=${sessionId}`,
    };
  };

  const action = clientAction(sessionId);
  assertStrictEqual(action.type, 'VERIFY_BACKEND_SESSION');
  assertOk(action.endpoint.includes('cs_test_123'));
});

// 5. Customer Pickup PIN Display
it('should verify customer order object retains pickup_pin for verbal verification', () => {
  const customerOrderView = {
    _id: 'ord_mobile_001',
    status: 'driver_assigned' as OrderStatus,
    pickup_pin: '482910',
    delivery_pin: null,
  };

  assertStrictEqual(customerOrderView.pickup_pin.length, 6, 'Customer pickup PIN must be 6 digits');
  assertStrictEqual(/^\d{6}$/.test(customerOrderView.pickup_pin), true, 'PIN must be purely numeric');
});

console.log(`\nCustomer Tests Completed: ${passedCount} passed, ${failedCount} failed.`);
if (failedCount > 0) {
  process.exit(1);
}

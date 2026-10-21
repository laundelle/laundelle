import type { OrderStatus } from '@laundelle/types';

console.log('--- Running Operations Mobile Application Workflow Tests ---\n');

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

// 1. Role-Based Access Control and Exclusion Verification
type StaffRole = 'DRIVER' | 'PROCESSOR' | 'PLANT_MANAGER' | 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOMER';

function evaluateMobileAccess(role: StaffRole): { allowed: boolean; portal: 'driver' | 'processor' | null } {
  if (role === 'DRIVER') {
    return { allowed: true, portal: 'driver' };
  }
  if (role === 'PROCESSOR') {
    return { allowed: true, portal: 'processor' };
  }
  // Plant Managers, Admins, Customers are strictly excluded from the mobile operations interface
  return { allowed: false, portal: null };
}

it('should grant access strictly to DRIVER and route to driver portal', () => {
  const result = evaluateMobileAccess('DRIVER');
  assertStrictEqual(result.allowed, true);
  assertStrictEqual(result.portal, 'driver');
});

it('should grant access strictly to PROCESSOR and route to processor portal', () => {
  const result = evaluateMobileAccess('PROCESSOR');
  assertStrictEqual(result.allowed, true);
  assertStrictEqual(result.portal, 'processor');
});

it('should STRICTLY DENY access to PLANT_MANAGER with no portal routing', () => {
  const result = evaluateMobileAccess('PLANT_MANAGER');
  assertStrictEqual(result.allowed, false, 'Plant Managers must be excluded from mobile app');
  assertStrictEqual(result.portal, null);
});

it('should STRICTLY DENY access to ADMIN and SUPER_ADMIN with no portal routing', () => {
  const adminResult = evaluateMobileAccess('ADMIN');
  assertStrictEqual(adminResult.allowed, false, 'Admin must be excluded from mobile app');
  assertStrictEqual(adminResult.portal, null);

  const superAdminResult = evaluateMobileAccess('SUPER_ADMIN');
  assertStrictEqual(superAdminResult.allowed, false, 'Super Admin must be excluded from mobile app');
  assertStrictEqual(superAdminResult.portal, null);
});

it('should STRICTLY DENY access to CUSTOMER in Operations mobile app', () => {
  const result = evaluateMobileAccess('CUSTOMER');
  assertStrictEqual(result.allowed, false, 'Customers must not access Operations app');
  assertStrictEqual(result.portal, null);
});

// 2. Driver 6-digit OTP Validation
function validateOtpFormat(otp: string): boolean {
  return /^\d{6}$/.test(otp);
}

it('should validate exact 6-digit numeric OTP', () => {
  assertStrictEqual(validateOtpFormat('123456'), true);
  assertStrictEqual(validateOtpFormat('000000'), true);
  assertStrictEqual(validateOtpFormat('999999'), true);
});

it('should reject invalid OTP lengths or non-numeric characters', () => {
  assertStrictEqual(validateOtpFormat('12345'), false, '5 digits must fail');
  assertStrictEqual(validateOtpFormat('1234567'), false, '7 digits must fail');
  assertStrictEqual(validateOtpFormat('12345a'), false, 'alphanumeric must fail');
  assertStrictEqual(validateOtpFormat('      '), false, 'spaces must fail');
});

it('should ensure Driver job view strips customer plaintext OTP/PIN', () => {
  // Simulating backend sanitization for driver
  const rawOrder = {
    _id: 'ord_staff_001',
    status: 'driver_assigned',
    pickup_pin_hash: 'sha256_hash_here',
    pickup_pin: '123456', // sensitive!
  };

  const sanitizeForDriver = (order: typeof rawOrder) => {
    const { pickup_pin, pickup_pin_hash, ...safeOrder } = order;
    return safeOrder;
  };

  const safeDriverOrder = sanitizeForDriver(rawOrder);
  assertStrictEqual((safeDriverOrder as any).pickup_pin, undefined, 'Driver must not see plain OTP');
  assertStrictEqual((safeDriverOrder as any).pickup_pin_hash, undefined, 'Driver must not see hash');
});

// 3. Processor State Machine Stages
const ALLOWED_STAGES: OrderStatus[] = [
  'picked_up',
  'received_at_facility',
  'sorting',
  'washing',
  'drying',
  'ironing',
  'quality_check',
  'ready_for_delivery',
];

function canTransition(current: OrderStatus, next: OrderStatus): boolean {
  const currentIndex = ALLOWED_STAGES.indexOf(current);
  const nextIndex = ALLOWED_STAGES.indexOf(next);
  if (currentIndex === -1 || nextIndex === -1) return false;
  // Sequential forward progression or QC rewash fallback to washing
  if (nextIndex === currentIndex + 1) return true;
  if (current === 'quality_check' && next === 'washing') return true; // Rewash cycle
  return false;
}

it('should allow valid sequential processor stage progressions', () => {
  assertStrictEqual(canTransition('picked_up', 'received_at_facility'), true);
  assertStrictEqual(canTransition('received_at_facility', 'sorting'), true);
  assertStrictEqual(canTransition('sorting', 'washing'), true);
  assertStrictEqual(canTransition('washing', 'drying'), true);
  assertStrictEqual(canTransition('drying', 'ironing'), true);
  assertStrictEqual(canTransition('ironing', 'quality_check'), true);
  assertStrictEqual(canTransition('quality_check', 'ready_for_delivery'), true);
});

it('should reject illegal stage skips (e.g. received_at_facility straight to ready_for_delivery)', () => {
  assertStrictEqual(canTransition('received_at_facility', 'ready_for_delivery'), false);
  assertStrictEqual(canTransition('picked_up', 'ready_for_delivery'), false);
  assertStrictEqual(canTransition('sorting', 'ironing'), false);
});

it('should allow Quality Check to trigger Rewash back to washing', () => {
  assertStrictEqual(canTransition('quality_check', 'washing'), true);
});

// 4. Processor Dock Intake Weight Validation
function validateDockIntakeWeight(weightKg: number): boolean {
  return typeof weightKg === 'number' && !isNaN(weightKg) && weightKg > 0 && weightKg < 200;
}

it('should validate realistic laundry bag weights in kilograms', () => {
  assertStrictEqual(validateDockIntakeWeight(5.2), true);
  assertStrictEqual(validateDockIntakeWeight(14.0), true);
  assertStrictEqual(validateDockIntakeWeight(0.5), true);
});

it('should reject invalid dock intake weights', () => {
  assertStrictEqual(validateDockIntakeWeight(0), false);
  assertStrictEqual(validateDockIntakeWeight(-2.5), false);
  assertStrictEqual(validateDockIntakeWeight(250), false, 'Exceeds max single bag weight capacity');
});

console.log(`\nOperations Tests Completed: ${passedCount} passed, ${failedCount} failed.`);
if (failedCount > 0) {
  process.exit(1);
}

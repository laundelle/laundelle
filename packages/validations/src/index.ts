import { z } from 'zod';

// Auth Validations
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

export const otpVerifySchema = z.object({
  phone: z.string().min(10, 'Valid phone number required'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

// Address Validations
export const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().default('Home'),
  flat: z.string().optional(),
  street: z.string().min(3, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  postcode: z.string().min(4, 'Valid UK postcode is required'),
  notes: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// Order Creation Validation
export const createOrderSchema = z.object({
  items: z.array(z.object({
    serviceId: z.string(),
    name: z.string(),
    price: z.number(),
    unit: z.string(),
    quantity: z.number().positive(),
    selectedOption: z.string().optional(),
    specialInstructions: z.string().optional(),
  })).min(1, 'Order must contain at least one item'),
  address: z.string().min(3, 'Collection address is required'),
  pickupDate: z.string().min(1, 'Pickup date is required'),
  pickupSlot: z.string().min(1, 'Pickup slot is required'),
  deliveryDate: z.string().optional(),
  deliverySlot: z.string().optional(),
  paymentMethod: z.string().default('Pay Online (Stripe)'),
  total: z.number().nonnegative(),
  notes: z.string().optional(),
});

// Driver Actions
export const driverPickupSchema = z.object({
  orderId: z.string(),
  pin: z.string().length(6, 'PIN must be 6 digits'),
  bagQr: z.string().min(1, 'Bag QR code is required'),
  notes: z.string().optional(),
});

export const driverDeliverySchema = z.object({
  orderId: z.string(),
  pin: z.string().length(6, 'PIN must be 6 digits'),
  signature: z.string().optional(),
  photoEvidence: z.string().optional(),
});

// Processor Actions
export const processorStageSchema = z.object({
  orderId: z.string(),
  stage: z.enum(['sorting', 'washing', 'drying', 'ironing', 'folding', 'quality_check', 'ready_for_delivery']),
  machineId: z.string().optional(),
  notes: z.string().optional(),
});

export const processorQcSchema = z.object({
  orderId: z.string(),
  passed: z.boolean(),
  notes: z.string().optional(),
  rewashReason: z.string().optional(),
});

// Manager Actions
export const managerAssignSchema = z.object({
  orderId: z.string(),
  assigneeId: z.string().nullable(),
  role: z.enum(['driver', 'processor']),
});

export const managerIncidentSchema = z.object({
  orderId: z.string().optional(),
  type: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(5),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

export * from './scheduleValidation';

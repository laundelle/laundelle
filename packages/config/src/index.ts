/**
 * Shared platform constants & non-secret configuration
 */

export const APP_NAME = 'Laundelle';
export const APP_LEGAL_NAME = 'Laundelle Garment Care Ltd';
export const DEFAULT_CURRENCY = 'GBP';
export const CURRENCY_SYMBOL = '£';

// Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  PROCESSOR: 'processor',
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const;

export type PlatformUserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Order Status Constants
export const ORDER_STATUSES = {
  BOOKING_CONFIRMED: 'booking_confirmed',
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_EN_ROUTE_PICKUP: 'driver_en_route_pickup',
  DRIVER_ARRIVED_PICKUP: 'driver_arrived_pickup',
  PICKED_UP: 'picked_up',
  RECEIVED_AT_FACILITY: 'received_at_facility',
  SORTING: 'sorting',
  WASHING: 'washing',
  DRYING: 'drying',
  IRONING: 'ironing',
  FOLDING: 'folding',
  QUALITY_CHECK: 'quality_check',
  READY_FOR_DELIVERY: 'ready_for_delivery',
  DRIVER_EN_ROUTE_DELIVERY: 'driver_en_route_delivery',
  DRIVER_ARRIVED_DELIVERY: 'driver_arrived_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold',
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  booking_confirmed: 'Booking Confirmed',
  driver_assigned: 'Driver Assigned',
  driver_en_route_pickup: 'Driver En Route',
  driver_arrived_pickup: 'Driver Arrived for Pickup',
  picked_up: 'Collected',
  received_at_facility: 'At Cleaning Facility',
  sorting: 'Sorting Garments',
  washing: 'Washing Cycle',
  drying: 'Drying Cycle',
  ironing: 'Steam Pressing',
  folding: 'Automated Folding',
  quality_check: 'Quality Control',
  ready_for_delivery: 'Ready for Delivery',
  driver_en_route_delivery: 'Out for Delivery',
  driver_arrived_delivery: 'Driver Arrived for Delivery',
  delivered: 'Delivered',
  completed: 'Order Completed',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

// SLA Defaults
export const SLA_DEFAULTS = {
  STANDARD_HOURS: 48,
  EXPRESS_HOURS: 24,
  SAME_DAY_HOURS: 12,
  MAX_COLLECTION_WINDOW_MINUTES: 120,
} as const;

// UK Postcode Regex Pattern
export const UK_POSTCODE_REGEX = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

// Default API Endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    VERIFY_OTP: '/api/v1/auth/verify-otp',
    SEND_OTP: '/api/v1/auth/send-otp',
  },
  ORDERS: '/api/v1/orders',
  DRIVER: '/api/v1/driver',
  PROCESSOR: '/api/v1/processor',
  MANAGER: '/api/v1/manager',
  ADMIN: '/api/v1/admin',
} as const;

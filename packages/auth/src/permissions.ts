export class ForbiddenError extends Error {
  public status: number = 403;
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Laundelle Canonical Auth0 Roles
 */
export const AUTH0_ROLES = [
  'super_admin',
  'plant_manager',
  'driver',
  'processor',
  'customer'
] as const;

export type Auth0Role = typeof AUTH0_ROLES[number];

/**
 * Super Admin Permissions
 */
export const SUPER_ADMIN_PERMISSIONS = [
  'users:create',
  'users:read',
  'users:update',
  'users:disable',
  'managers:create',
  'managers:read',
  'managers:update',
  'drivers:create',
  'drivers:read',
  'drivers:update',
  'drivers:disable',
  'processors:create',
  'processors:read',
  'processors:update',
  'processors:disable',
  'orders:read',
  'orders:update',
  'orders:assign',
  'plants:read',
  'plant:read',
  'plants:create',
  'plants:update'
] as const;

/**
 * Plant Manager Permissions
 */
export const PLANT_MANAGER_PERMISSIONS = [
  'drivers:create',
  'drivers:read',
  'drivers:update',
  'processors:create',
  'processors:read',
  'processors:update',
  'orders:read',
  'orders:update',
  'orders:assign',
  'plants:read',
  'plant:read'
] as const;

/**
 * Driver Permissions (Minimal scope)
 */
export const DRIVER_PERMISSIONS = [
  'orders:read',
  'orders:update',
  'driver:jobs:read',
  'driver:jobs:update'
] as const;

/**
 * Processor Permissions (Minimal scope)
 */
export const PROCESSOR_PERMISSIONS = [
  'orders:read',
  'orders:update',
  'processor:jobs:read',
  'processor:jobs:update'
] as const;

/**
 * Customer Permissions (Minimal scope)
 */
export const CUSTOMER_PERMISSIONS = [
  'orders:read',
  'orders:create',
  'customer:profile:read',
  'customer:profile:update'
] as const;

export type AppPermission =
  | typeof SUPER_ADMIN_PERMISSIONS[number]
  | typeof PLANT_MANAGER_PERMISSIONS[number]
  | typeof DRIVER_PERMISSIONS[number]
  | typeof PROCESSOR_PERMISSIONS[number]
  | typeof CUSTOMER_PERMISSIONS[number];

/**
 * Normalizes legacy role names to canonical Auth0 roles.
 * 'admin' -> 'super_admin'
 * 'manager' -> 'plant_manager'
 */
export function normalizeRole(role?: string | null): Auth0Role | null {
  if (!role) return null;
  const r = role.toLowerCase().trim();
  if (r === 'super_admin' || r === 'admin') return 'super_admin';
  if (r === 'plant_manager' || r === 'manager') return 'plant_manager';
  if (r === 'driver') return 'driver';
  if (r === 'processor') return 'processor';
  if (r === 'customer') return 'customer';
  return null;
}

/**
 * Retrieves the full permission set for a given role.
 */
export function getRolePermissions(role?: string | null): readonly string[] {
  const norm = normalizeRole(role);
  if (!norm) return [];
  switch (norm) {
    case 'super_admin':
      return [
        ...SUPER_ADMIN_PERMISSIONS,
        ...ADMIN_ONLY_OVERRIDES,
        ...MANAGER_ALLOWED_OVERRIDES
      ];
    case 'plant_manager':
      return [
        ...PLANT_MANAGER_PERMISSIONS,
        ...MANAGER_ALLOWED_OVERRIDES
      ];
    case 'driver':
      return DRIVER_PERMISSIONS;
    case 'processor':
      return PROCESSOR_PERMISSIONS;
    case 'customer':
      return CUSTOMER_PERMISSIONS;
    default:
      return [];
  }
}

/**
 * Evaluates whether an actor possesses the specified permission.
 * Checks Auth0 token claims first, then falls back to canonical role inheritance.
 */
export function hasPermission(
  role: string | null | undefined,
  tokenPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  const equivalentPermissions = (requiredPermission === 'plant:read' || requiredPermission === 'plants:read')
    ? ['plants:read', 'plant:read']
    : [requiredPermission];

  if (Array.isArray(tokenPermissions) && tokenPermissions.some(p => equivalentPermissions.includes(p))) {
    return true;
  }
  const rolePerms = getRolePermissions(role);
  return rolePerms.some(p => equivalentPermissions.includes(p));
}

/**
 * LAUNDELLE Role-Based Override Permission Definitions (Operational / Incidents)
 */
export const MANAGER_ALLOWED_OVERRIDES = [
  'reschedule_slot',
  'edit_order_details',
  'resend_pickup_otp',
  'generate_new_otp', // alias for resend_pickup_otp
  'resend_delivery_otp',
  'generate_new_delivery_otp', // alias for resend_delivery_otp
  'mark_customer_unavailable',
  'return_to_plant',
  'advance_stage',
  'flag_rewash',
  'unassign_driver',
  'unassign_processor'
] as const;

export type ManagerAllowedOverride = typeof MANAGER_ALLOWED_OVERRIDES[number];

export const ADMIN_ONLY_OVERRIDES = [
  'force_pickup_otp',
  'confirm_pickup', // alias for force_pickup_otp
  'force_delivery_pin',
  'confirm_delivery', // alias for force_delivery_pin
  'cancel_order',
  'reopen_order',
  'rollback_pickup',
  'rollback_delivery',
  'put_on_hold',
  'edit_order_items',
  'admin_status_override'
] as const;

export type AdminOnlyOverride = typeof ADMIN_ONLY_OVERRIDES[number];

export const ADMIN_ONLY_RESOLVE_TYPES = [
  'refund',
  'credit',
  'replacement'
] as const;

export type AdminOnlyResolveType = typeof ADMIN_ONLY_RESOLVE_TYPES[number];

/**
 * Checks whether a given role is allowed to perform an override action.
 * Admins and super_admins inherit all capabilities.
 */
export function canPerformOverride(role: string | null | undefined, action: string): boolean {
  if (!role) return false;
  const norm = normalizeRole(role);
  if (norm === 'super_admin') return true;
  if (norm === 'plant_manager') {
    return (MANAGER_ALLOWED_OVERRIDES as readonly string[]).includes(action);
  }
  return false;
}

/**
 * Asserts that the role can execute the specified override action.
 * Throws ForbiddenError (HTTP 403) if unauthorized.
 */
export function assertCanPerformOverride(role: string | null | undefined, action: string): void {
  if (!canPerformOverride(role, action)) {
    throw new ForbiddenError(`Access Denied: Admin authorization required for override action: ${action}`);
  }
}

/**
 * Checks whether a role is authorized to execute an incident resolution remedy.
 * Financial remedies (refund, credit, replacement) are strictly Admin-only.
 * Operational remedies (rewash, dismissed, manual) can be handled by managers.
 */
export function canResolveDispute(role: string | null | undefined, resolveType: string): boolean {
  if (!role) return false;
  const norm = normalizeRole(role);
  if (norm === 'super_admin') return true;
  if (norm === 'plant_manager') {
    if ((ADMIN_ONLY_RESOLVE_TYPES as readonly string[]).includes(resolveType)) {
      return false;
    }
    return ['rewash', 'dismissed', 'manual'].includes(resolveType);
  }
  return false;
}

/**
 * Asserts that the role can execute the specified incident resolution type.
 * Throws ForbiddenError (HTTP 403) if unauthorized.
 */
export function assertCanResolveDispute(role: string | null | undefined, resolveType: string): void {
  if (!canResolveDispute(role, resolveType)) {
    throw new ForbiddenError(`Access Denied: Admin authorization required for financial resolution remedy: ${resolveType}`);
  }
}

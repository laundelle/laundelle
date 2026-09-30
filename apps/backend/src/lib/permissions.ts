import { ForbiddenError } from './api';

/**
 * LAUNDELLE Role-Based Override Permission Definitions
 *
 * Permission Model:
 * ADMIN (admin, super_admin) -> Inherits ALL manager permissions + ALL restricted operational & financial overrides
 * MANAGER (manager)          -> Basic day-to-day operational overrides only
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
  const normalizedRole = role.toLowerCase().trim();

  // Admin & Super Admin have unrestricted override access
  if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
    return true;
  }

  // Manager is strictly restricted to basic operational overrides
  if (normalizedRole === 'manager') {
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
  const normalizedRole = role.toLowerCase().trim();

  if (normalizedRole === 'admin' || normalizedRole === 'super_admin') {
    return true;
  }

  if (normalizedRole === 'manager') {
    // Managers cannot execute financial remedies
    if ((ADMIN_ONLY_RESOLVE_TYPES as readonly string[]).includes(resolveType)) {
      return false;
    }
    // Managers can trigger operational rewashes or close notes
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

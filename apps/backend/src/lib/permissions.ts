import { ForbiddenError } from './api';

export {
  AUTH0_ROLES,
  type Auth0Role,
  SUPER_ADMIN_PERMISSIONS,
  PLANT_MANAGER_PERMISSIONS,
  DRIVER_PERMISSIONS,
  PROCESSOR_PERMISSIONS,
  CUSTOMER_PERMISSIONS,
  type AppPermission,
  normalizeRole,
  getRolePermissions,
  hasPermission,
  MANAGER_ALLOWED_OVERRIDES,
  type ManagerAllowedOverride,
  ADMIN_ONLY_OVERRIDES,
  type AdminOnlyOverride,
  ADMIN_ONLY_RESOLVE_TYPES,
  type AdminOnlyResolveType,
  canPerformOverride,
  canResolveDispute,
} from '@laundelle/auth';

import {
  canPerformOverride as baseCanPerformOverride,
  canResolveDispute as baseCanResolveDispute,
  hasPermission as baseHasPermission,
} from '@laundelle/auth';

/**
 * Asserts that the role can execute the specified override action.
 * Throws ForbiddenError (HTTP 403) if unauthorized.
 */
export function assertCanPerformOverride(role: string | null | undefined, action: string): void {
  if (!baseCanPerformOverride(role, action)) {
    throw new ForbiddenError(`Access Denied: Admin authorization required for override action: ${action}`);
  }
}

/**
 * Asserts that the role can execute the specified incident resolution type.
 * Throws ForbiddenError (HTTP 403) if unauthorized.
 */
export function assertCanResolveDispute(role: string | null | undefined, resolveType: string): void {
  if (!baseCanResolveDispute(role, resolveType)) {
    throw new ForbiddenError(`Access Denied: Admin authorization required for financial resolution remedy: ${resolveType}`);
  }
}

/**
 * Asserts that the user/role possesses the required permission.
 * Throws ForbiddenError (HTTP 403) if unauthorized.
 */
export function assertHasPermission(
  role: string | null | undefined,
  tokenPermissions: string[] | undefined,
  requiredPermission: string
): void {
  if (!baseHasPermission(role, tokenPermissions, requiredPermission)) {
    throw new ForbiddenError(`Access Denied: Missing required permission "${requiredPermission}"`);
  }
}

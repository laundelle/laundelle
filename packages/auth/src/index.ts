/**
 * Shared client and token auth utilities
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  roleLabel?: string;
  plantId?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  isAuthenticated: boolean;
}

export const SESSION_STORAGE_KEY = 'l2u_auth_session';
export const AUTH_CHANGE_EVENT = 'l2u_auth_change';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ? (parsed as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Failed to save auth session:', err);
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Failed to clear auth session:', err);
  }
}

export function getAuthToken(): string | null {
  return getStoredSession()?.token ?? null;
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function isOperationsRole(role?: string): boolean {
  return role === 'driver' || role === 'processor' || role === 'manager';
}

export function isAdminRole(role?: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function getRoleLandingPath(role?: string): string {
  switch (role) {
    case 'driver':
      return '/driver';
    case 'processor':
      return '/processor';
    case 'manager':
      return '/manager';
    case 'admin':
    case 'super_admin':
      return '/';
    case 'customer':
    default:
      return '/';
  }
}

export * from './permissions';

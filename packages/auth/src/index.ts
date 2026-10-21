/**
 * Shared client and token auth utilities
 */

export interface AuthUser {
  id: string;
  publicId?: string;
  email: string;
  name: string;
  role?: string;
  roleLabel?: string;
  plantId?: string;
  plant_id?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  isAuthenticated: boolean;
  role?: string;
  csrfToken?: string;
}

export const SESSION_STORAGE_KEY = 'l2u_auth_session';
export const AUTH_CHANGE_EVENT = 'l2u_auth_change';

// In-memory session store (prevents token exfiltration from localStorage)
let inMemorySession: AuthSession | null = null;
let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(csrf: string | null): void {
  inMemoryCsrfToken = csrf;
}

export function getCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function getStoredSession(): AuthSession | null {
  if (inMemorySession) return inMemorySession;
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.token || parsed.isAuthenticated)) {
      if (!parsed.token) {
        const storedToken = localStorage.getItem('l2u_token');
        if (storedToken) parsed.token = storedToken;
      }
      inMemorySession = parsed as AuthSession;
      if (parsed.csrfToken) inMemoryCsrfToken = parsed.csrfToken;
      return inMemorySession;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  inMemorySession = session;
  if (session.csrfToken) inMemoryCsrfToken = session.csrfToken;
  if (typeof window === 'undefined') return;
  try {
    const sessionToStore = {
      token: session.token || '',
      user: session.user,
      isAuthenticated: session.isAuthenticated,
      role: session.role || session.user?.role,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToStore));
    if (session.token) {
      localStorage.setItem('l2u_token', session.token);
    }
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Failed to save auth session:', err);
  }
}

export function clearSession(): void {
  inMemorySession = null;
  inMemoryCsrfToken = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem('l2u_token');
    localStorage.removeItem('l2u_customer_profile');
    localStorage.removeItem('l2u_customer_orders');
    localStorage.removeItem('l2u_customer_notifications');
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch (err) {
    console.error('Failed to clear auth session:', err);
  }
}

export function getAuthToken(): string | null {
  if (inMemorySession?.token) return inMemorySession.token;
  if (typeof window !== 'undefined') {
    try {
      const stored = getStoredSession();
      if (stored?.token) return stored.token;
      const direct = localStorage.getItem('l2u_token');
      if (direct) return direct;
    } catch {}
  }
  return null;
}

export function authHeaders(): HeadersInit {
  const token = getAuthToken();
  const csrf = getCsrfToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
  };
}

export function isOperationsRole(role?: string): boolean {
  const norm = (role || '').toLowerCase().trim();
  return norm === 'driver' || norm === 'processor' || norm === 'manager' || norm === 'plant_manager';
}

export function isAdminRole(role?: string): boolean {
  const norm = (role || '').toLowerCase().trim();
  return norm === 'admin' || norm === 'super_admin';
}

export function getRoleLandingPath(role?: string): string {
  const norm = (role || '').toLowerCase().trim();
  switch (norm) {
    case 'driver':
      return '/driver';
    case 'processor':
      return '/processor';
    case 'manager':
    case 'plant_manager':
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

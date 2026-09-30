export type UserRole = 'customer' | 'admin' | 'manager' | 'driver' | 'processor';

export interface AuthSession {
  role: UserRole | null;
  user: {
    id: string;
    name: string;
    email: string;
    roleLabel: string;
    employeeNumber?: string;
    role?: string;
  } | null;
  isAuthenticated: boolean;
}

export function parseCurrentRoute(): { rolePath: string; subPath: string } {
  const hash = window.location.hash.replace('#', '') || '/customer/home';
  const parts = hash.split('/').filter(Boolean);

  const rolePath = parts[0] || 'customer';
  const subPath = parts.slice(1).join('/') || 'home';

  return { rolePath, subPath };
}

export function navigateToRoute(rolePath: string, subPath: string = 'home') {
  window.location.hash = `/${rolePath}/${subPath}`;
}

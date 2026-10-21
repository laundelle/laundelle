export type UserRole = 'customer' | 'admin' | 'manager' | 'driver' | 'processor';

export interface AuthSession {
  role: UserRole | string | null;
  user: {
    id: string;
    name: string;
    email: string;
    roleLabel?: string;
    employeeNumber?: string;
    role?: string;
    publicId?: string;
    plantId?: string;
    plant_id?: string;
  } | null;
  isAuthenticated: boolean;
  token?: string;
  csrfToken?: string;
}

export function parseCurrentRoute(): { rolePath: string; subPath: string } {
  if (typeof window === 'undefined') {
    return { rolePath: 'customer', subPath: 'home' };
  }
  const hash = window.location.hash.replace('#', '') || '/customer/home';
  const parts = hash.split('/').filter(Boolean);

  const rolePath = parts[0] || 'customer';
  const subPath = parts.slice(1).join('/') || 'home';

  return { rolePath, subPath };
}

export function navigateToRoute(rolePath: string, subPath: string = 'home') {
  if (typeof window !== 'undefined') {
    window.location.hash = `/${rolePath}/${subPath}`;
  }
}

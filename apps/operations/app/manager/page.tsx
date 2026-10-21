'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { getStoredSession, clearSession, saveSession, setCsrfToken, AuthSession, normalizeRole } from '@laundelle/auth';
import { dbAuth0Sync } from '@laundelle/api-client';
import { ManagerPortalContainer } from '@/components/manager/ManagerPortalContainer';
import { ManagerLoginPage } from '@/components/manager/ManagerLoginPage';

export default function ManagerPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    isAuthenticated: isAuth0Authenticated,
    user: auth0User,
    isLoading: isAuth0Loading,
    logout: auth0Logout,
    getAccessTokenSilently,
    getIdTokenClaims,
  } = useAuth0();

  useEffect(() => {
    setSession(getStoredSession());
    setMounted(true);

    const handleAuthChange = () => {
      setSession(getStoredSession());
    };
    window.addEventListener('l2u_auth_change', handleAuthChange);
    return () => window.removeEventListener('l2u_auth_change', handleAuthChange);
  }, []);

  // Sync Auth0 user into backend and verify manager permissions
  useEffect(() => {
    let cancelled = false;

    const syncManagerSession = async () => {
      if (!isAuth0Loading && isAuth0Authenticated && auth0User) {
        setIsSyncing(true);
        setAuthError(null);

        const email = auth0User.email || '';
        const name = auth0User.name || auth0User.nickname || email.split('@')[0] || 'Manager';
        const sub = auth0User.sub || '';
        const picture = auth0User.picture;

        try {
          const idClaims = await getIdTokenClaims().catch(() => undefined);
          const accessToken = idClaims?.__raw || (await getAccessTokenSilently().catch(() => undefined));
          const syncResult = await dbAuth0Sync({ email, name, sub, picture, portal: 'operations' }, accessToken);
          if (cancelled) return;

          if (syncResult.error || !syncResult.user) {
            setAuthError(syncResult.error || 'Failed to authenticate plant manager account.');
            setIsSyncing(false);
            return;
          }

          if ((syncResult as any).csrfToken) {
            setCsrfToken((syncResult as any).csrfToken);
          }

          const role = syncResult.user.role;
          if (role === 'driver') {
            const driverSession: AuthSession = {
              isAuthenticated: true,
              role: 'driver',
              token: syncResult.token || '',
              user: {
                id: syncResult.user.id || syncResult.user.publicId || sub,
                name: syncResult.user.name || name,
                email: syncResult.user.email || email,
                role: 'driver',
                roleLabel: 'Courier Driver',
              },
            };
            saveSession(driverSession);
            router.replace('/driver');
            return;
          }

          if (role === 'processor') {
            const processorSession: AuthSession = {
              isAuthenticated: true,
              role: 'processor',
              token: syncResult.token || '',
              user: {
                id: syncResult.user.id || syncResult.user.publicId || sub,
                name: syncResult.user.name || name,
                email: syncResult.user.email || email,
                role: 'processor',
                roleLabel: 'Facility Operator',
              },
            };
            saveSession(processorSession);
            router.replace('/processor');
            return;
          }

          const normRole = normalizeRole(role);
          if (normRole !== 'plant_manager' && normRole !== 'super_admin') {
            setAuthError(
              `Access denied: Account "${email}" has role "${role || 'customer'}". This portal is for Plant Operations Managers only.`
            );
            clearSession();
            setSession(null);
            setIsSyncing(false);
            return;
          }

          const managerSession: AuthSession = {
            isAuthenticated: true,
            role: role as any,
            token: syncResult.token || '',
            csrfToken: (syncResult as any).csrfToken,
            user: {
              id: syncResult.user.id || syncResult.user.publicId || sub,
              name: syncResult.user.name || name,
              email: syncResult.user.email || email,
              role: role as any,
              roleLabel: role === 'super_admin' ? 'Super Administrator' : role === 'admin' ? 'Administrator' : 'Plant Manager',
              plantId: syncResult.user.plant_id || syncResult.user.plantId,
              plant_id: syncResult.user.plant_id || syncResult.user.plantId,
            },
          };

          if ((syncResult as any).csrfToken) {
            setCsrfToken((syncResult as any).csrfToken);
          }
          saveSession(managerSession);
          setSession(managerSession);
          setAuthError(null);
        } catch (err: any) {
          if (!cancelled) {
            setAuthError(err?.message || 'Failed to verify manager credentials with backend.');
          }
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }
    };

    syncManagerSession();

    return () => {
      cancelled = true;
    };
  }, [isAuth0Loading, isAuth0Authenticated, auth0User]);

  if (!mounted || isSyncing) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0077B6]"></div>
        <span className="text-xs font-bold text-gray-500">Authenticating plant manager credentials...</span>
      </div>
    );
  }

  const sessionNormRole = normalizeRole(session?.user?.role);
  if (!session?.isAuthenticated || (sessionNormRole !== 'plant_manager' && sessionNormRole !== 'super_admin')) {
    return (
      <ManagerLoginPage
        errorMessage={authError}
        onManagerLoginSuccess={() => {
          setSession(getStoredSession());
        }}
        onAuth0Logout={() => {
          clearSession();
          setSession(null);
          setAuthError(null);
          auth0Logout({
            logoutParams: {
              returnTo: typeof window !== 'undefined' ? `${window.location.origin}/manager` : undefined,
            },
          });
        }}
        onNavigateToCustomer={() => {
          router.push('/');
        }}
        onNavigateToAdminLogin={() => {
          const adminBase = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';
          window.location.href = adminBase;
        }}
      />
    );
  }

  return (
    <ManagerPortalContainer
      userName={session.user.name}
      onSignOut={() => {
        clearSession();
        setSession(null);
        if (isAuth0Authenticated) {
          auth0Logout({
            logoutParams: {
              returnTo: typeof window !== 'undefined' ? `${window.location.origin}/manager` : undefined,
            },
          });
        }
      }}
    />
  );
}

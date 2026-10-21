'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { getStoredSession, clearSession, saveSession, AuthSession } from '@laundelle/auth';
import { dbAuth0Sync, setCsrfToken } from '@laundelle/api-client';
import { DriverPortal } from '@/components/driver/DriverPortal';
import { DriverLoginPage } from '@/components/driver/DriverLoginPage';

export default function DriverPage() {
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

  // Sync Auth0 user into backend and verify driver permissions
  useEffect(() => {
    let cancelled = false;

    const syncDriverSession = async () => {
      if (!isAuth0Loading && isAuth0Authenticated && auth0User) {
        setIsSyncing(true);
        setAuthError(null);

        const email = auth0User.email || '';
        const name = auth0User.name || auth0User.nickname || email.split('@')[0] || 'Driver';
        const sub = auth0User.sub || '';
        const picture = auth0User.picture;

        try {
          const idClaims = await getIdTokenClaims().catch(() => undefined);
          const accessToken = idClaims?.__raw || (await getAccessTokenSilently().catch(() => undefined));
          const syncResult = await dbAuth0Sync({ email, name, sub, picture, portal: 'operations' }, accessToken);
          if (cancelled) return;

          if (syncResult.error || !syncResult.user) {
            setAuthError(syncResult.error || 'Failed to authenticate driver account.');
            setIsSyncing(false);
            return;
          }

          const role = syncResult.user.role;
          if (role === 'manager' || role === 'admin' || role === 'super_admin') {
            const managerSession: AuthSession = {
              isAuthenticated: true,
              role: role as any,
              token: syncResult.token || '',
              user: {
                id: syncResult.user.id || syncResult.user.publicId || sub,
                name: syncResult.user.name || name,
                email: syncResult.user.email || email,
                role: role as any,
                roleLabel: role === 'super_admin' ? 'Super Administrator' : role === 'admin' ? 'Administrator' : 'Plant Manager',
              },
            };
            saveSession(managerSession);
            router.replace('/manager');
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

          if (role !== 'driver') {
            setAuthError(
              `Access denied: Account "${email}" has role "${role || 'customer'}". This portal is for registered Logistics Drivers only.`
            );
            clearSession();
            setSession(null);
            setIsSyncing(false);
            return;
          }

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

          if (syncResult.csrfToken) {
            setCsrfToken(syncResult.csrfToken);
          }
          saveSession(driverSession);
          setSession(driverSession);
          setAuthError(null);
        } catch (err: any) {
          if (!cancelled) {
            setAuthError(err?.message || 'Failed to verify driver credentials with backend.');
          }
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }
    };

    syncDriverSession();

    return () => {
      cancelled = true;
    };
  }, [isAuth0Loading, isAuth0Authenticated, auth0User]);

  if (!mounted || isSyncing) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03045E]"></div>
        <span className="text-xs font-bold text-gray-500">Authenticating courier profile...</span>
      </div>
    );
  }

  // If unauthenticated or role is not driver, render DriverLoginPage
  if (!session?.isAuthenticated || session?.user?.role !== 'driver') {
    return (
      <DriverLoginPage
        errorMessage={authError}
        onDriverLoginSuccess={() => {
          setSession(getStoredSession());
        }}
        onAuth0Logout={() => {
          clearSession();
          setSession(null);
          setAuthError(null);
          auth0Logout({
            logoutParams: {
              returnTo: typeof window !== 'undefined' ? `${window.location.origin}/driver` : undefined,
            },
          });
        }}
        onNavigateToCustomer={() => {
          router.push('/');
        }}
      />
    );
  }

  return (
    <DriverPortal
      userName={session.user.name}
      onSignOut={() => {
        clearSession();
        setSession(null);
        if (isAuth0Authenticated) {
          auth0Logout({
            logoutParams: {
              returnTo: typeof window !== 'undefined' ? `${window.location.origin}/driver` : undefined,
            },
          });
        }
      }}
    />
  );
}

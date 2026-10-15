'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth0 } from '@auth0/auth0-react';
import { getStoredSession, saveSession, clearSession, AuthSession } from '@laundelle/auth';
import { dbAuth0Sync } from '@laundelle/api-client';
import { OperationsLoginPage } from '@/components/OperationsLoginPage';

export default function OperationsLandingPage() {
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

  // Helper to redirect based on operational role
  const redirectByRole = (role: string) => {
    if (role === 'driver') {
      router.replace('/driver');
      return true;
    }
    if (role === 'processor') {
      router.replace('/processor');
      return true;
    }
    if (role === 'manager' || role === 'plant_manager' || role === 'admin' || role === 'super_admin') {
      router.replace('/manager');
      return true;
    }
    return false;
  };

  // Check existing stored session on mount
  useEffect(() => {
    const existingSession = getStoredSession();
    setSession(existingSession);
    setMounted(true);

    if (existingSession?.isAuthenticated && existingSession?.user?.role) {
      if (['driver', 'processor', 'manager', 'plant_manager', 'admin', 'super_admin'].includes(existingSession.user.role)) {
        if (redirectByRole(existingSession.user.role)) {
          return;
        }
      }
    }

    const handleAuthChange = () => {
      const updated = getStoredSession();
      setSession(updated);
      if (updated?.isAuthenticated && updated?.user?.role) {
        if (['driver', 'processor', 'manager', 'plant_manager', 'admin', 'super_admin'].includes(updated.user.role)) {
          redirectByRole(updated.user.role);
        }
      }
    };

    window.addEventListener('l2u_auth_change', handleAuthChange);
    return () => window.removeEventListener('l2u_auth_change', handleAuthChange);
  }, [router]);

  // Sync Auth0 credentials and redirect automatically based on role stored in MongoDB
  useEffect(() => {
    let cancelled = false;

    const syncOperationsSession = async () => {
      if (!isAuth0Loading && isAuth0Authenticated && auth0User) {
        setIsSyncing(true);
        setAuthError(null);

        const email = auth0User.email || '';
        const name = auth0User.name || auth0User.nickname || email.split('@')[0] || 'Staff';
        const sub = auth0User.sub || '';
        const picture = auth0User.picture;

        try {
          const nowSec = Math.floor(Date.now() / 1000);
          let idClaims = await getIdTokenClaims().catch(() => undefined);
          if (!idClaims?.__raw || !idClaims.exp || idClaims.exp <= nowSec + 60) {
            try {
              await getAccessTokenSilently({ cacheMode: 'off' });
              idClaims = await getIdTokenClaims().catch(() => undefined);
            } catch {}
          }
          const accessToken = idClaims?.__raw || (await getAccessTokenSilently().catch(() => undefined));
          const syncResult = await dbAuth0Sync({ email, name, sub, picture, portal: 'operations' }, accessToken);
          if (cancelled) return;

          if (syncResult.error || !syncResult.user) {
            setAuthError(syncResult.error || 'Failed to authenticate operations staff account.');
            clearSession();
            setSession(null);
            setIsSyncing(false);
            return;
          }

          const role = syncResult.user.role;
          if (role !== 'driver' && role !== 'processor' && role !== 'manager' && role !== 'plant_manager' && role !== 'admin' && role !== 'super_admin') {
            setAuthError(`Access Restricted: Account "${email}" has role "${role || 'customer'}". This portal is restricted to authorized Operations Staff only.`);
            clearSession();
            setSession(null);
            setIsSyncing(false);
            return;
          }

          const roleLabel =
            role === 'driver'
              ? 'Courier Driver'
              : role === 'processor'
              ? 'Facility Operator'
              : role === 'super_admin'
              ? 'Super Administrator'
              : role === 'admin'
              ? 'Administrator'
              : 'Plant Manager';

          const opsSession: AuthSession = {
            isAuthenticated: true,
            role: (role === 'plant_manager' ? 'manager' : role) as any,
            token: syncResult.token || '',
            user: {
              id: syncResult.user.id || syncResult.user.publicId || sub,
              name: syncResult.user.name || name,
              email: syncResult.user.email || email,
              role: (role === 'plant_manager' ? 'manager' : role) as any,
              roleLabel,
            },
          };

          saveSession(opsSession);
          setSession(opsSession);
          setAuthError(null);

          // Route to designated dashboard based on role
          redirectByRole(role === 'plant_manager' ? 'manager' : role);
        } catch (err: any) {
          if (!cancelled) {
            setAuthError(err?.message || 'Failed to verify staff credentials with backend.');
            clearSession();
            setSession(null);
          }
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }
    };

    syncOperationsSession();

    return () => {
      cancelled = true;
    };
  }, [isAuth0Loading, isAuth0Authenticated, auth0User, getAccessTokenSilently, getIdTokenClaims, router]);

  // If already logged in and currently redirecting, show quick spinner
  if (!mounted || (session?.isAuthenticated && ['driver', 'processor', 'manager', 'plant_manager', 'admin', 'super_admin'].includes(session.user.role))) {
    return (
      <div className="min-h-screen bg-[#FAFCFF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0077B6]"></div>
      </div>
    );
  }

  // Directly show the unified Operations Login page
  return (
    <OperationsLoginPage
      errorMessage={authError}
      isSyncing={isSyncing}
      onAuth0Logout={() => {
        clearSession();
        setSession(null);
        setAuthError(null);
        auth0Logout({
          logoutParams: {
            returnTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
      }}
    />
  );
}

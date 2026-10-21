'use client';

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getStoredSession, clearSession, saveSession, AuthSession } from '@laundelle/auth';
import { dbAuth0Sync, dbFetchSession, setCsrfToken } from '@laundelle/api-client';
import { AdminPortal } from '@/components/AdminPortal';
import { AdminLoginPage } from '@/components/AdminLoginPage';

export default function AdminUserGuidePage() {
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

  // Load existing session from in-memory / secure cookie
  useEffect(() => {
    const existing = getStoredSession();
    if (existing?.isAuthenticated && (existing.user?.role === 'admin' || existing.user?.role === 'super_admin')) {
      setSession(existing);
      setMounted(true);
    } else {
      dbFetchSession().then((sess) => {
        if (sess.isAuthenticated && (sess.user?.role === 'admin' || sess.user?.role === 'super_admin')) {
          const rehydrated: AuthSession = {
            isAuthenticated: true,
            role: sess.user.role,
            token: '',
            user: {
              id: sess.user.id || sess.user.publicId,
              name: sess.user.name,
              email: sess.user.email,
              role: sess.user.role,
              roleLabel: sess.user.role === 'super_admin' ? 'Super Administrator' : 'Administrator',
            }
          };
          saveSession(rehydrated);
          setSession(rehydrated);
        } else if (existing?.isAuthenticated) {
          clearSession();
          setSession(null);
        } else {
          setSession(null);
        }
      }).catch(() => {
        setSession(null);
      }).finally(() => {
        setMounted(true);
      });
    }

    const handleAuthChange = () => {
      const updated = getStoredSession();
      if (updated?.isAuthenticated && (updated.user?.role === 'admin' || updated.user?.role === 'super_admin')) {
        setSession(updated);
      } else {
        setSession(null);
      }
    };
    window.addEventListener('l2u_auth_change', handleAuthChange);
    return () => window.removeEventListener('l2u_auth_change', handleAuthChange);
  }, []);

  // Sync Auth0 user into backend and verify admin permissions from MongoDB
  useEffect(() => {
    let cancelled = false;

    const syncAdminSession = async () => {
      if (!isAuth0Loading && isAuth0Authenticated && auth0User) {
        setIsSyncing(true);
        setAuthError(null);

        const email = auth0User.email || '';
        const name = auth0User.name || auth0User.nickname || email.split('@')[0] || 'Administrator';
        const sub = auth0User.sub || '';
        const picture = auth0User.picture;

        try {
          const idClaims = await getIdTokenClaims().catch(() => undefined);
          const accessToken = idClaims?.__raw || (await getAccessTokenSilently().catch(() => undefined));
          const syncResult = await dbAuth0Sync({ email, name, sub, picture, portal: 'admin' }, accessToken);
          if (cancelled) return;

          if (syncResult.error || !syncResult.user) {
            setAuthError(syncResult.error || 'Failed to authenticate administrator account.');
            setIsSyncing(false);
            return;
          }

          const role = syncResult.user.role;
          if (role !== 'admin' && role !== 'super_admin') {
            setAuthError('Access Denied: Your account does not have administrator privileges.');
            clearSession();
            setSession(null);
            setIsSyncing(false);
            return;
          }

          const adminSession: AuthSession = {
            isAuthenticated: true,
            role,
            token: '',
            user: {
              id: syncResult.user.id || syncResult.user.publicId || '',
              name: syncResult.user.name || name,
              email: syncResult.user.email || email,
              role,
              roleLabel: role === 'super_admin' ? 'Super Administrator' : 'Administrator',
            },
          };

          if (syncResult.csrfToken) {
            setCsrfToken(syncResult.csrfToken);
          }
          saveSession(adminSession);
          setSession(adminSession);
          setAuthError(null);
        } catch (err: any) {
          if (!cancelled) {
            setAuthError(err?.message || 'Failed to verify admin credentials with backend.');
          }
        } finally {
          if (!cancelled) setIsSyncing(false);
        }
      }
    };

    syncAdminSession();

    return () => {
      cancelled = true;
    };
  }, [isAuth0Loading, isAuth0Authenticated, auth0User, getAccessTokenSilently, getIdTokenClaims]);

  if (!mounted || isSyncing) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03045E]"></div>
        <span className="text-xs font-bold text-gray-500">Verifying administrator credentials...</span>
      </div>
    );
  }

  // If unauthenticated or role is not admin / super_admin, render AdminLoginPage
  if (!session?.isAuthenticated || (session?.user?.role !== 'admin' && session?.user?.role !== 'super_admin')) {
    return (
      <AdminLoginPage
        errorMessage={authError}
        onAdminLoginSuccess={() => {
          setSession(getStoredSession());
        }}
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
        onNavigateToCustomer={() => {
          window.location.href = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
        }}
        onNavigateToManagerLogin={() => {
          const opsBase = process.env.NEXT_PUBLIC_OPERATIONS_URL || 'http://localhost:3001';
          window.location.href = `${opsBase}/manager`;
        }}
      />
    );
  }

  return (
    <AdminPortal
      orders={[]}
      userRole={session.user.role || 'admin'}
      userName={session.user.name}
      initialTab="user_guide"
      onExitAdmin={() => {
        clearSession();
        setSession(null);
        if (isAuth0Authenticated) {
          auth0Logout({
            logoutParams: {
              returnTo: typeof window !== 'undefined' ? window.location.origin : undefined,
            },
          });
        }
      }}
    />
  );
}

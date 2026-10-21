import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { opsApi } from '../services/api';
import { opsStorage, StaffUser } from '../services/storage';

interface OpsAuthContextValue {
  user: StaffUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthorizedStaff: boolean; // only true if role is 'driver' or 'processor'
  role: 'driver' | 'processor' | 'unauthorized' | null;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<StaffUser>;
  auth0Login: (idToken: string, profile: { email: string; name?: string; sub?: string; picture?: string }) => Promise<StaffUser>;
  logout: () => Promise<void>;
}

const OpsAuthContext = createContext<OpsAuthContextValue | undefined>(undefined);

export function OpsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const determineRole = (userRole?: string): 'driver' | 'processor' | 'unauthorized' | null => {
    if (!userRole) return null;
    const norm = userRole.toLowerCase().trim();
    if (norm === 'driver') return 'driver';
    if (norm === 'processor') return 'processor';
    return 'unauthorized';
  };

  const initAuth = async () => {
    try {
      const storedToken = await opsStorage.getToken();
      const storedUser = await opsStorage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (e) {
      console.warn('Failed to restore staff session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }): Promise<StaffUser> => {
    setIsLoading(true);
    try {
      const res = await opsApi.auth.login(credentials);
      if (res?.token && res?.user) {
        const staffUser: StaffUser = {
          id: res.user.id || res.user.publicId || res.user.staffId,
          email: res.user.email,
          name: res.user.name || res.user.full_name || 'Staff Member',
          role: res.user.role || '',
          plantId: res.user.plantId || res.user.plant_id,
        };

        await opsStorage.saveToken(res.token);
        await opsStorage.saveUser(staffUser);
        setToken(res.token);
        setUser(staffUser);
        return staffUser;
      } else {
        throw new Error(res?.error || 'Staff authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const auth0Login = async (
    idToken: string,
    profile: { email: string; name?: string; sub?: string; picture?: string }
  ): Promise<StaffUser> => {
    setIsLoading(true);
    try {
      const syncResult = await opsApi.auth.auth0Sync({
        email: profile.email,
        name: profile.name,
        sub: profile.sub,
        picture: profile.picture,
        portal: 'operations',
      }, idToken);

      if (syncResult?.error || !syncResult?.user) {
        throw new Error(syncResult?.error || 'Auth0 operations sync failed');
      }

      const effectiveToken = syncResult?.token || idToken;
      const u = syncResult.user;
      const staffUser: StaffUser = {
        id: u.id || u.publicId || u.staffId || profile.sub || '',
        email: u.email || profile.email,
        name: u.name || u.full_name || profile.name || 'Operations Staff',
        role: u.role || '',
        plantId: u.plantId || u.plant_id,
      };

      await opsStorage.saveToken(effectiveToken);
      await opsStorage.saveUser(staffUser);
      setToken(effectiveToken);
      setUser(staffUser);
      return staffUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await opsApi.auth.logout().catch(() => {});
    } finally {
      await opsStorage.clearSession();
      setToken(null);
      setUser(null);
    }
  };

  const activeRole = determineRole(user?.role);
  const isAuthorizedStaff = activeRole === 'driver' || activeRole === 'processor';

  return (
    <OpsAuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isAuthorizedStaff,
        role: activeRole,
        isLoading,
        login,
        auth0Login,
        logout,
      }}
    >
      {children}
    </OpsAuthContext.Provider>
  );
}

export function useOpsAuth() {
  const context = useContext(OpsAuthContext);
  if (!context) {
    throw new Error('useOpsAuth must be used within an OpsAuthProvider');
  }
  return context;
}

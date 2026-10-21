import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '@laundelle/types';
import { mobileApi } from '../services/api';
import { authStorage } from '../services/storage';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  auth0Login: (idToken: string, profile: { email: string; name?: string; sub?: string; picture?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    try {
      const storedToken = await authStorage.getToken();
      const storedUser = await authStorage.getUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await mobileApi.auth.login(credentials);
      if (res?.token && res?.user) {
        await authStorage.saveToken(res.token);
        await authStorage.saveUser(res.user);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error(res?.error || 'Authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { email: string; password: string; full_name: string; phone?: string }) => {
    setIsLoading(true);
    try {
      const res = await mobileApi.auth.register(payload);
      if (res?.token && res?.user) {
        await authStorage.saveToken(res.token);
        await authStorage.saveUser(res.user);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error(res?.error || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const auth0Login = async (idToken: string, profile: { email: string; name?: string; sub?: string; picture?: string }) => {
    setIsLoading(true);
    try {
      const syncResult = await mobileApi.auth.auth0Sync({
        email: profile.email,
        name: profile.name,
        sub: profile.sub,
        picture: profile.picture,
        portal: 'customer',
      }, idToken);

      const effectiveToken = syncResult?.token || idToken;
      const effectiveUser = syncResult?.user || {
        email: profile.email,
        name: profile.name || '',
        role: 'customer',
      };

      await authStorage.saveToken(effectiveToken);
      await authStorage.saveUser(effectiveUser);
      setToken(effectiveToken);
      setUser(effectiveUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await mobileApi.auth.logout().catch(() => {});
    } finally {
      await authStorage.clearSession();
      setToken(null);
      setUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const freshUser = await mobileApi.customer.getProfile();
      if (freshUser) {
        await authStorage.saveUser(freshUser);
        setUser(freshUser);
      }
    } catch (e) {
      console.warn('Failed to refresh profile:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        register,
        auth0Login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

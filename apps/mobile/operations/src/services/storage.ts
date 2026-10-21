import * as SecureStore from 'expo-secure-store';

const STAFF_ACCESS_TOKEN_KEY = 'laundelle_ops_jwt';
const STAFF_REFRESH_TOKEN_KEY = 'laundelle_ops_refresh_token';
const STAFF_USER_KEY = 'laundelle_ops_user';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: 'driver' | 'processor' | 'manager' | 'admin' | 'customer' | string;
  plantId?: string;
  plantName?: string;
}

// In-memory access token cache for operational staff
let inMemoryStaffAccessToken: string | null = null;

export const opsStorage = {
  /**
   * Retrieves access token, prioritizing fast in-memory cache then falling back to hardware-backed SecureStore.
   */
  async getToken(): Promise<string | null> {
    if (inMemoryStaffAccessToken) return inMemoryStaffAccessToken;
    try {
      const stored = await SecureStore.getItemAsync(STAFF_ACCESS_TOKEN_KEY);
      if (stored) inMemoryStaffAccessToken = stored;
      return stored;
    } catch {
      return null;
    }
  },

  /**
   * Stores short-lived access token in memory and hardware-backed SecureStore.
   */
  async saveToken(token: string): Promise<void> {
    inMemoryStaffAccessToken = token;
    try {
      await SecureStore.setItemAsync(STAFF_ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore saveToken error:', e);
    }
  },

  async removeToken(): Promise<void> {
    inMemoryStaffAccessToken = null;
    try {
      await SecureStore.deleteItemAsync(STAFF_ACCESS_TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore removeToken error:', e);
    }
  },

  /**
   * Securely manages long-lived staff refresh tokens exclusively inside SecureStore.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STAFF_REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STAFF_REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.warn('SecureStore saveRefreshToken error:', e);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STAFF_REFRESH_TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore removeRefreshToken error:', e);
    }
  },

  async getUser(): Promise<StaffUser | null> {
    try {
      const raw = await SecureStore.getItemAsync(STAFF_USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async saveUser(user: StaffUser): Promise<void> {
    try {
      await SecureStore.setItemAsync(STAFF_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('SecureStore saveUser error:', e);
    }
  },

  /**
   * Complete operational staff session invalidation: purges memory, access token,
   * refresh token, and staff profile from SecureStore.
   */
  async clearSession(): Promise<void> {
    inMemoryStaffAccessToken = null;
    await Promise.all([
      this.removeToken().catch(() => {}),
      this.removeRefreshToken().catch(() => {}),
      SecureStore.deleteItemAsync(STAFF_USER_KEY).catch(() => {}),
    ]);
  },
};

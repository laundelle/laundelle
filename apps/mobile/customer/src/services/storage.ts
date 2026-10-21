import * as SecureStore from 'expo-secure-store';
import { UserProfile } from '@laundelle/types';

const ACCESS_TOKEN_KEY = 'laundelle_customer_jwt';
const REFRESH_TOKEN_KEY = 'laundelle_customer_refresh_token';
const USER_KEY = 'laundelle_customer_user';

// Ephemeral in-memory token cache (minimizes Keystore reads and isolates tokens in memory)
let inMemoryAccessToken: string | null = null;

export const authStorage = {
  /**
   * Retrieves access token, prioritizing fast in-memory cache then falling back to hardware-backed SecureStore.
   */
  async getToken(): Promise<string | null> {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (stored) inMemoryAccessToken = stored;
      return stored;
    } catch {
      return null;
    }
  },

  /**
   * Stores short-lived access token in memory and hardware-backed SecureStore.
   */
  async saveToken(token: string): Promise<void> {
    inMemoryAccessToken = token;
    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch (e) {
      console.warn('SecureStore saveToken error:', e);
    }
  },

  async removeToken(): Promise<void> {
    inMemoryAccessToken = null;
    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore removeToken error:', e);
    }
  },

  /**
   * Securely manages long-lived refresh tokens exclusively inside SecureStore.
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  async saveRefreshToken(refreshToken: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } catch (e) {
      console.warn('SecureStore saveRefreshToken error:', e);
    }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      console.warn('SecureStore removeRefreshToken error:', e);
    }
  },

  async getUser(): Promise<UserProfile | null> {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async saveUser(user: UserProfile): Promise<void> {
    try {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('SecureStore saveUser error:', e);
    }
  },

  /**
   * Thorough session cleanup: purges in-memory access token, SecureStore access token,
   * refresh token, and user profile data upon logout or revocation.
   */
  async clearSession(): Promise<void> {
    inMemoryAccessToken = null;
    await Promise.all([
      this.removeToken().catch(() => {}),
      this.removeRefreshToken().catch(() => {}),
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {}),
    ]);
  },
};

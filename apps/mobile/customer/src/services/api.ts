import { Platform } from 'react-native';
import { LaundelleApiClient } from '@laundelle/api-client';
import { authStorage } from './storage';

function getDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // Android emulator loopback alias
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
}

export const mobileApi = new LaundelleApiClient({
  baseUrl: getDefaultApiUrl(),
  getToken: () => authStorage.getToken(),
  getRefreshToken: () => authStorage.getRefreshToken(),
  onTokenRefresh: async ({ accessToken, refreshToken }) => {
    await authStorage.saveToken(accessToken);
    if (refreshToken) {
      await authStorage.saveRefreshToken(refreshToken);
    }
  },
  onAuthFailure: async () => {
    await authStorage.clearSession();
  },
  auth0Domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'laundelle.uk.auth0.com',
  auth0ClientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
});


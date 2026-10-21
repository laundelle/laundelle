import { Platform } from 'react-native';
import { LaundelleApiClient } from '@laundelle/api-client';
import { opsStorage } from './storage';

function getDefaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000';
  }
  return 'http://localhost:4000';
}

export const opsApi = new LaundelleApiClient({
  baseUrl: getDefaultApiUrl(),
  getToken: () => opsStorage.getToken(),
  getRefreshToken: () => opsStorage.getRefreshToken(),
  onTokenRefresh: async ({ accessToken, refreshToken }) => {
    await opsStorage.saveToken(accessToken);
    if (refreshToken) {
      await opsStorage.saveRefreshToken(refreshToken);
    }
  },
  onAuthFailure: async () => {
    await opsStorage.clearSession();
  },
  auth0Domain: process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'laundelle.uk.auth0.com',
  auth0ClientId: process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID,
});


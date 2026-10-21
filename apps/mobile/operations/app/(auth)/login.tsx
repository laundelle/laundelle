import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useOpsAuth } from '../../src/context/AuthContext';
import { opsStorage } from '../../src/services/storage';

WebBrowser.maybeCompleteAuthSession();

export default function StaffLoginScreen() {
  const router = useRouter();
  const { login, auth0Login } = useOpsAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [auth0Loading, setAuth0Loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'laundelle.uk.auth0.com';
  const auth0ClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'dummy_mobile_ops_id';

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'laundelle-ops',
    path: 'auth/callback',
  });

  const discovery = {
    authorizationEndpoint: `https://${auth0Domain}/authorize`,
    tokenEndpoint: `https://${auth0Domain}/oauth/token`,
    revocationEndpoint: `https://${auth0Domain}/oauth/revoke`,
  };

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: auth0ClientId,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: {
        audience: `https://${auth0Domain}/api/v2/`,
      },
    },
    discovery
  );

  const routeStaffMember = (staffRole: string) => {
    const norm = (staffRole || '').toLowerCase().trim();
    if (norm === 'driver') {
      router.replace('/(driver)');
    } else if (norm === 'processor') {
      router.replace('/(processor)');
    } else {
      router.replace('/(auth)/access-denied');
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your staff email address and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const staffUser = await login({ email: email.trim().toLowerCase(), password });
      routeStaffMember(staffUser.role);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials or permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth0StaffLogin = async () => {
    setAuth0Loading(true);
    setError(null);

    try {
      const authResult = await promptAsync();
      if (authResult.type === 'success' && authResult.params.code) {
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: auth0ClientId,
            code: authResult.params.code,
            redirectUri,
            extraParams: {
              code_verifier: request?.codeVerifier || '',
            },
          },
          discovery
        );

        if (tokenResult.refreshToken) {
          await opsStorage.saveRefreshToken(tokenResult.refreshToken);
        }

        if (tokenResult.idToken) {
          const payloadBase64 = tokenResult.idToken.split('.')[1];
          const decodedJson = atob(payloadBase64);
          const claims = JSON.parse(decodedJson);

          const staffUser = await auth0Login(tokenResult.idToken, {
            email: claims.email || '',
            name: claims.name || claims.nickname,
            sub: claims.sub,
            picture: claims.picture,
          });

          routeStaffMember(staffUser.role);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Auth0 staff login could not be completed.');
    } finally {
      setAuth0Loading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>OPS</Text>
            </View>
            <Text style={styles.title}>Laundelle Operations</Text>
            <Text style={styles.subtitle}>
              Dedicated mobile application for Drivers & Facility Processors
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Auth0 Universal Login for Operations Staff */}
          <Button
            title="Sign In with Auth0 SSO"
            variant="outline"
            onPress={handleAuth0StaffLogin}
            loading={auth0Loading}
            icon={<Ionicons name="shield-checkmark" size={18} color={Colors.primary} />}
            style={styles.auth0Btn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or staff credentials</Text>
            <View style={styles.dividerLine} />
          </View>

          <Input
            label="Staff Email"
            placeholder="driver@laundelle.co.uk"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Ionicons name="mail-outline" size={18} color={Colors.textMuted} />}
          />

          <Input
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />}
          />

          <Button
            title="Access Staff Terminal"
            onPress={handleEmailLogin}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.noticeText}>
              Plant Managers and Administrators must sign in through the Web Operations Portal.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoText: {
    color: Colors.surface,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: 8,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  auth0Btn: {
    marginBottom: Spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardAlt,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xl,
  },
  noticeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});

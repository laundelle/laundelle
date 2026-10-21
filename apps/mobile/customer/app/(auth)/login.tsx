import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Colors, Spacing, BorderRadius } from '../../src/theme/colors';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { useAuth } from '../../src/context/AuthContext';
import { authStorage } from '../../src/services/storage';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, auth0Login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [auth0Loading, setAuth0Loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth0 Discovery & Request configuration
  const auth0Domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || 'laundelle.uk.auth0.com';
  const auth0ClientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || 'dummy_mobile_client_id';

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'laundelle-customer',
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

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth0Login = async () => {
    setAuth0Loading(true);
    setError(null);
    try {
      const authResult = await promptAsync();
      if (authResult.type === 'success' && authResult.params.code) {
        // Exchange code for token securely
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
          await authStorage.saveRefreshToken(tokenResult.refreshToken);
        }

        if (tokenResult.idToken) {
          // Parse JWT payload safely
          const payloadBase64 = tokenResult.idToken.split('.')[1];
          const decodedJson = atob(payloadBase64);
          const claims = JSON.parse(decodedJson);

          await auth0Login(tokenResult.idToken, {
            email: claims.email || '',
            name: claims.name || claims.nickname,
            sub: claims.sub,
            picture: claims.picture,
          });

          router.replace('/(tabs)');
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Auth0 Universal Login could not be completed.');
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
              <Text style={styles.logoText}>L</Text>
            </View>
            <Text style={styles.title}>Welcome to Laundelle</Text>
            <Text style={styles.subtitle}>Premium laundry, dry cleaning & ironing at your doorstep</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={Colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Auth0 Universal Login Button */}
          <Button
            title="Continue with Auth0"
            variant="outline"
            onPress={handleAuth0Login}
            loading={auth0Loading}
            icon={<Ionicons name="shield-checkmark" size={18} color={Colors.primary} />}
            style={styles.auth0Btn}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email / Password Form */}
          <Input
            label="Email Address"
            placeholder="you@example.com"
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
            title="Sign In"
            onPress={handleEmailLogin}
            loading={loading}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={styles.guestLink}
          >
            <Text style={styles.guestText}>Continue as Guest / Browse Services</Text>
          </TouchableOpacity>
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
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  logoText: {
    color: Colors.surface,
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
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
    fontWeight: '500',
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
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  submitBtn: {
    marginTop: Spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
  },
  guestLink: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  guestText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

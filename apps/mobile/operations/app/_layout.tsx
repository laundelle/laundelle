import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OpsAuthProvider, useOpsAuth } from '../src/context/AuthContext';
import { LoadingScreen } from '../src/components/LoadingScreen';

function RootNavigationGate() {
  const { isAuthenticated, role, isLoading } = useOpsAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDriverGroup = segments[0] === '(driver)';
    const inProcessorGroup = segments[0] === '(processor)';

    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else {
      if (role === 'driver') {
        if (!inDriverGroup) {
          router.replace('/(driver)');
        }
      } else if (role === 'processor') {
        if (!inProcessorGroup) {
          router.replace('/(processor)');
        }
      } else {
        // Unauthorized role (plant_manager, admin, customer, etc.)
        router.replace('/(auth)/access-denied');
      }
    }
  }, [isAuthenticated, role, isLoading, segments]);

  if (isLoading) {
    return <LoadingScreen message="Checking staff credentials..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(driver)" options={{ headerShown: false }} />
      <Stack.Screen name="(processor)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <OpsAuthProvider>
        <StatusBar style="dark" />
        <RootNavigationGate />
      </OpsAuthProvider>
    </SafeAreaProvider>
  );
}

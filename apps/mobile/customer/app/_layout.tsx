import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="booking/index" options={{ presentation: 'card' }} />
          <Stack.Screen name="booking/checkout" options={{ presentation: 'card' }} />
          <Stack.Screen name="orders/[id]" options={{ presentation: 'card' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

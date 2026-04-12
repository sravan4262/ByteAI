import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuthStore } from '../src/stores/authStore';
import { API, setUnauthorizedListener } from '../src/services/api';
import { C } from '../src/constants/colors';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Clerk token cache using SecureStore
const tokenCache = {
  getToken: (key: string) => SecureStore.getItemAsync(key),
  saveToken: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  clearToken: (key: string) => SecureStore.deleteItemAsync(key),
};

const clerkKey = Constants.expoConfig?.extra?.clerkPublishableKey as string;

// ─── Auth gate ────────────────────────────────────────────────────────────

function AuthGate() {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const segments = useSegments();
  const { auth, setAuthenticated, setOnboarding, setUnauthenticated, setToken } = useAuthStore();

  // Wire up the 401 listener for auto sign-out
  useEffect(() => {
    setUnauthorizedListener(async () => {
      const token = await getToken().catch(() => null);
      if (token) {
        setToken(token);
      } else {
        await signOut();
        setUnauthenticated();
      }
    });
  }, []);

  // Bootstrap session on mount
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUnauthenticated();
      return;
    }
    (async () => {
      const token = await getToken().catch(() => null);
      if (token) setToken(token);
      try {
        const me = await API.getMe();
        setAuthenticated(me);
      } catch {
        setOnboarding();
      }
    })();
  }, [isLoaded, isSignedIn]);

  // Navigate based on auth state
  useEffect(() => {
    if (auth.status === 'loading') return;
    const inAuth = segments[0] === '(auth)';
    if (auth.status === 'unauthenticated' && !inAuth) router.replace('/(auth)');
    else if (auth.status === 'onboarding') router.replace('/(auth)/onboarding');
    else if (auth.status === 'authenticated' && inAuth) router.replace('/(tabs)');
  }, [auth.status]);

  if (!isLoaded || auth.status === 'loading') {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <View style={s.root}>
            <AuthGate />
          </View>
        </QueryClientProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
});

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/stores/authStore';
import { API } from '../../src/services/api';
import { C } from '../../src/constants/colors';

WebBrowser.maybeCompleteAuthSession();

type Mode = 'signIn' | 'signUp' | 'otp';

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { signIn, setActive: setSignInActive } = useSignIn();
  const { signUp, setActive: setSignUpActive } = useSignUp();
  const { setAuthenticated, setOnboarding, setToken } = useAuthStore();

  async function afterSession(getToken: () => Promise<string | null>) {
    const token = await getToken().catch(() => null);
    if (token) setToken(token);
    try {
      const me = await API.getMe();
      setAuthenticated(me);
    } catch {
      setOnboarding();
    }
  }

  async function handleGoogle() {
    try {
      setLoading(true);
      const { createdSessionId, setActive, authSessionResult } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive?.({ session: createdSessionId });
        await afterSession(() =>
          signIn?.client?.activeSessions?.[0]?.getToken() ?? Promise.resolve(null)
        );
      }
    } catch (err: any) {
      if (!err?.message?.includes('session_exists')) {
        Alert.alert('Error', err?.message ?? 'Google sign-in failed');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignIn() {
    if (!email.trim()) return;
    try {
      setLoading(true);
      await signIn?.create({ strategy: 'email_code', identifier: email });
      setMode('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignUp() {
    if (!email.trim() || !firstName.trim() || !username.trim()) return;
    try {
      setLoading(true);
      await signUp?.create({ emailAddress: email, firstName, lastName, username });
      await signUp?.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMode('otp');
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not create account');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return;
    try {
      setLoading(true);
      if (mode === 'otp' && signIn?.status === 'needs_first_factor') {
        const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code: otp });
        if (result.status === 'complete') {
          await setSignInActive?.({ session: result.createdSessionId });
          await afterSession(() => result.createdSessionId
            ? signIn.client?.sessions?.[0]?.getToken() ?? Promise.resolve(null)
            : Promise.resolve(null)
          );
        }
      } else if (signUp) {
        const result = await signUp.attemptEmailAddressVerification({ code: otp });
        if (result.status === 'complete') {
          await setSignUpActive?.({ session: result.createdSessionId });
          setOnboarding();
        }
      }
    } catch (err: any) {
      Alert.alert('Invalid code', err?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={s.logoBox}>
          <Text style={s.logo}>⚡</Text>
          <Text style={s.logoText}>ByteAI</Text>
          <Text style={s.tagline}>Tech in bytes. Learn in seconds.</Text>
        </View>

        {mode === 'otp' ? (
          <>
            <Text style={s.sectionTitle}>Enter the code sent to {email}</Text>
            <OtpInput value={otp} onChange={setOtp} />
            <PrimaryButton label="Verify" loading={loading} onPress={handleVerifyOtp} />
            <TouchableOpacity onPress={() => setMode('signIn')} style={s.switchRow}>
              <Text style={s.switchText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Tab */}
            <View style={s.tabs}>
              {(['signIn', 'signUp'] as Mode[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.tab, mode === m && s.tabActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[s.tabText, mode === m && s.tabTextActive]}>
                    {m === 'signIn' ? 'Sign In' : 'Register'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Google */}
            <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.8}>
              <Text style={s.googleIcon}>G</Text>
              <Text style={s.googleText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {mode === 'signUp' && (
              <>
                <ByteInput placeholder="First name" value={firstName} onChangeText={setFirstName} icon="person-outline" />
                <ByteInput placeholder="Last name" value={lastName} onChangeText={setLastName} icon="person-outline" />
                <ByteInput placeholder="Username" value={username} onChangeText={setUsername} icon="at-outline" autoCapitalize="none" />
              </>
            )}

            <ByteInput
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <PrimaryButton
              label={mode === 'signIn' ? 'Send Code' : 'Create Account'}
              loading={loading}
              onPress={mode === 'signIn' ? handleEmailSignIn : handleEmailSignUp}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Small reusable widgets ───────────────────────────────────────────────

function ByteInput({ icon, ...props }: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={inp.container}>
      <Ionicons name={icon} size={18} color={C.text3} style={inp.icon} />
      <TextInput
        style={inp.input}
        placeholderTextColor={C.text3}
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}

function PrimaryButton({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={btn.primary} onPress={onPress} disabled={loading} activeOpacity={0.85}>
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={btn.text}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={inp.otpInput}
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
      maxLength={6}
      placeholder="000000"
      placeholderTextColor={C.text3}
      textAlign="center"
    />
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  scroll: { padding: 24, paddingTop: 80, gap: 14 },
  logoBox: { alignItems: 'center', marginBottom: 24, gap: 6 },
  logo: { fontSize: 48 },
  logoText: { fontSize: 28, fontWeight: '800', color: C.text1, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: C.text3 },
  tabs: { flexDirection: 'row', backgroundColor: C.element, borderRadius: 10, padding: 4, marginBottom: 4 },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontSize: 14, fontWeight: '600', color: C.text3 },
  tabTextActive: { color: '#fff' },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.element, borderRadius: 12, paddingVertical: 14,
    borderWidth: 1, borderColor: C.borderMed,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: C.text1 },
  googleText: { fontSize: 15, fontWeight: '500', color: C.text1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 12, color: C.text3 },
  sectionTitle: { fontSize: 14, color: C.text2, textAlign: 'center' },
  switchRow: { alignItems: 'center', paddingVertical: 8 },
  switchText: { fontSize: 14, color: C.accent },
});

const inp = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.element, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, height: 50, gap: 10,
  },
  icon: {},
  input: { flex: 1, fontSize: 15, color: C.text1 },
  otpInput: {
    backgroundColor: C.element, borderRadius: 12,
    borderWidth: 1, borderColor: C.borderMed,
    paddingHorizontal: 14, height: 60,
    fontSize: 28, fontWeight: '700', color: C.text1,
    letterSpacing: 12,
  },
});

const btn = StyleSheet.create({
  primary: {
    backgroundColor: C.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  text: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

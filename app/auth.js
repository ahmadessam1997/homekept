import { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn, signUp, signInWithGoogle, isConfigured } from '../lib/auth';
import { ensureTrialStarted, TRIAL_DAYS } from '../lib/entitlement';
import { C, S, type } from '../lib/theme';

// The gate: every launch lands here until there is an account.
export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('signup'); // most arrivals are new users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  // The trial clock starts with the account, not with the install, so exploring
  // the sign-in screen never costs the user a day.
  const enter = async () => {
    await ensureTrialStarted();
    router.replace('/');
  };

  const submit = async () => {
    setError('');
    setNotice('');
    if (!email.includes('@')) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      if (signup) {
        const { needsConfirm } = await signUp(email.trim().toLowerCase(), password);
        if (needsConfirm) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
          return;
        }
      } else {
        await signIn(email.trim().toLowerCase(), password);
      }
      await enter();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await signInWithGoogle();
      await enter();
    } catch (e) {
      // Backing out of the Google sheet is a choice, not an error worth shouting about.
      const cancelled = e?.code === 'SIGN_IN_CANCELLED' || /cancell?ed/i.test(e?.message || '');
      if (!cancelled) setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.plaster }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 40 }}>🏠</Text>
        <Text style={[type.h1, { marginTop: S.sm }]}>
          {signup ? 'Welcome to HomeKept' : 'Welcome back'}
        </Text>
        <Text style={[type.sub, { marginTop: S.xs, marginBottom: S.lg }]}>
          {signup
            ? `Create an account to start your ${TRIAL_DAYS}-day free trial. No card required — your home data stays on this device.`
            : 'Sign in to pick up your schedule where you left off.'}
        </Text>

        <Pressable onPress={google} disabled={busy} style={[styles.google, busy && styles.dim]}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Continue with Google</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={[type.sub, { marginHorizontal: S.sm }]}>or</Text>
          <View style={styles.divider} />
        </View>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={C.inkSoft}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={C.inkSoft}
          secureTextEntry
          autoComplete={signup ? 'new-password' : 'current-password'}
          style={styles.input}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.notice}>{notice}</Text>}

        <Pressable onPress={submit} disabled={busy} style={[styles.cta, busy && styles.dim]}>
          <Text style={styles.ctaText}>
            {busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'}
          </Text>
        </Pressable>

        {signup && (
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.sm }]}>
            No payment details needed — creating an account never asks for a card or billing
            address. Billing happens only through Google Play if you subscribe later. By
            creating an account you agree to our Terms of Service and Privacy Policy.
          </Text>
        )}

        <Pressable
          onPress={() => { setMode(signup ? 'signin' : 'signup'); setError(''); setNotice(''); }}
          style={{ padding: S.md, alignItems: 'center' }}
        >
          <Text style={{ color: C.inkSoft, fontWeight: '600' }}>
            {signup ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>

        {!isConfigured && (
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.md }]}>
            Dev mode: accounts are stored on this device only. Add your Supabase keys in
            lib/auth.js to go live.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.lg, paddingTop: S.xl },
  input: {
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 14,
    padding: S.md, fontSize: 16, color: C.ink, marginBottom: S.sm + 2,
  },
  google: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: S.sm,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 14,
    padding: S.md,
  },
  googleG: { fontSize: 17, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '700', color: C.ink },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: S.md },
  divider: { flex: 1, height: 1, backgroundColor: C.line },
  error: { color: C.ember, fontWeight: '600', marginBottom: S.sm },
  notice: { color: C.ok, fontWeight: '600', marginBottom: S.sm },
  cta: {
    backgroundColor: C.pine, borderRadius: 14, padding: S.md, alignItems: 'center',
    marginTop: S.xs,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dim: { opacity: 0.6 },
});

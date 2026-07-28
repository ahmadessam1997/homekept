import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { getProfile } from '../lib/storage';
import { getUser } from '../lib/auth';
import { getAccessState } from '../lib/entitlement';
import { C, S, type } from '../lib/theme';

// Entry gate. Order matters: an account comes first, so nobody reaches the
// schedule (or burns trial days) before signing in.
export default function Index() {
  const [state, setState] = useState('loading');

  const resolve = useCallback(async () => {
    setState('loading');
    try {
      const user = await getUser();
      if (!user) return 'auth';
      const profile = await getProfile();
      if (!profile) return 'new';
      const access = await getAccessState();
      return access.ok ? 'ready' : 'locked';
    } catch {
      // Don't guess on failure: routing a returning user to onboarding would
      // invite them to overwrite the profile they already have.
      return 'error';
    }
  }, []);

  useEffect(() => {
    let alive = true;
    resolve().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, [resolve]);

  const retry = () => { resolve().then(setState); };

  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={C.pine} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.center, { padding: S.lg }]}>
        <Text style={[type.h2, { textAlign: 'center' }]}>We couldn’t open your home</Text>
        <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
          Nothing was lost — your schedule and history are safe on this device.
        </Text>
        <Pressable onPress={retry} style={styles.retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const href = {
    auth: '/auth', new: '/onboarding', ready: '/dashboard', locked: '/paywall',
  }[state];
  return <Redirect href={href} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.plaster },
  retry: {
    backgroundColor: C.pine, borderRadius: 14, paddingVertical: S.sm + 4,
    paddingHorizontal: S.lg, marginTop: S.md,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

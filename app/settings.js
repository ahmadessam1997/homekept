import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { resetAll } from '../lib/storage';
import { getUser, signOut } from '../lib/auth';
import { getAccessState, _devSetTrialDaysAgo, _devResetAccess } from '../lib/entitlement';
import { C, S, type } from '../lib/theme';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);

  const refresh = useCallback(() => {
    getUser().then(setUser).catch(() => setUser(null));
    getAccessState().then(setAccess).catch(() => setAccess(null));
  }, []);
  useFocusEffect(refresh);

  const confirmReset = () =>
    Alert.alert('Start over?', 'This clears your home profile and full history on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset everything',
        style: 'destructive',
        onPress: async () => {
          await resetAll();
          router.replace('/onboarding');
        },
      },
    ]);

  const subLabel = !access
    ? '…'
    : access.reason === 'subscribed'
      ? `HomeKept Plus — active (${access.plan})`
      : access.reason === 'trial'
        ? `Free trial — ${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} left`
        : 'Trial ended — subscription required';

  return (
    <ScrollView style={{ backgroundColor: C.plaster }} contentContainerStyle={{ padding: S.md }}>
      <Text style={[type.label, { marginBottom: S.sm }]}>Account</Text>

      <View style={styles.row}>
        <Text style={[type.body, { fontWeight: '600' }]}>{user ? user.email : '…'}</Text>
        <Text style={type.sub}>Your subscription is linked to this account.</Text>
      </View>

      <Pressable style={styles.row} onPress={() => router.push('/paywall')}>
        <Text style={[type.body, { fontWeight: '600' }]}>Subscription</Text>
        <Text style={type.sub}>{subLabel}</Text>
      </Pressable>

      {user && (
        <Pressable
          style={styles.row}
          // Signing in is required, so returning to the gate is the only
          // coherent destination after signing out.
          onPress={async () => { await signOut(); router.replace('/auth'); }}
        >
          <Text style={[type.body, { fontWeight: '600' }]}>Sign out</Text>
          <Text style={type.sub}>Your home data stays on this device.</Text>
        </Pressable>
      )}

      <Text style={[type.label, { marginTop: S.md, marginBottom: S.sm }]}>Home</Text>

      <Pressable style={styles.row} onPress={() => router.push('/onboarding')}>
        <Text style={[type.body, { fontWeight: '600' }]}>Edit home profile</Text>
        <Text style={type.sub}>Re-run setup — your history is kept.</Text>
      </Pressable>

      <Pressable style={styles.row} onPress={confirmReset}>
        <Text style={[type.body, { fontWeight: '600', color: C.ember }]}>Reset all data</Text>
        <Text style={type.sub}>Clears profile and history from this device.</Text>
      </Pressable>

      <View style={[styles.row, { borderStyle: 'dashed' }]}>
        <Text style={[type.body, { fontWeight: '600' }]}>About your data</Text>
        <Text style={type.sub}>
          Your home profile, history, and costs live on your device. Your account is used only
          for your subscription.
        </Text>
      </View>

      {__DEV__ && (
        <>
          <Text style={[type.label, { marginTop: S.md, marginBottom: S.sm }]}>Dev tools</Text>
          <Pressable
            style={[styles.row, { borderStyle: 'dashed' }]}
            onPress={async () => { await _devSetTrialDaysAgo(15); refresh(); }}
          >
            <Text style={[type.body, { fontWeight: '600' }]}>Dev: expire trial now</Text>
          </Pressable>
          <Pressable
            style={[styles.row, { borderStyle: 'dashed' }]}
            onPress={async () => { await _devResetAccess(); refresh(); }}
          >
            <Text style={[type.body, { fontWeight: '600' }]}>Dev: reset trial & clear subscription</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line,
    padding: S.md, marginBottom: S.sm + 2, gap: 2,
  },
});

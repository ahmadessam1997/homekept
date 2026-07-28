import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
// react-native's own SafeAreaView is a no-op on Android, which let the content
// slide under the status bar on every headerShown:false screen.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getUser } from '../lib/auth';
import { PLANS, purchase, restorePurchases, isMockBilling, isBillingUnavailable } from '../lib/billing';
import { getAccessState, TRIAL_DAYS } from '../lib/entitlement';
import { C, S, type } from '../lib/theme';

export default function Paywall() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [access, setAccess] = useState(null);
  const [planId, setPlanId] = useState('annual');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getUser().then((u) => { if (alive) setUser(u); }).catch(() => {});
      getAccessState()
        .then((a) => { if (alive) setAccess(a); })
        // Leaving `access` null would hide every exit from this screen, so fall
        // back to the locked state, which always renders its own way out.
        .catch(() => { if (alive) setAccess({ ok: false, reason: 'expired' }); });
      return () => { alive = false; };
    }, []),
  );

  const trialActive = access?.reason === 'trial';
  const subscribed = access?.reason === 'subscribed';
  // Anyone who still has access must be able to leave; only an expired trial is
  // a hard gate. Without this a paying subscriber who opens Settings →
  // Subscription lands on a headerless screen with no way back.
  const dismissable = access ? access.ok : false;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const buy = async () => {
    setBusy(true);
    try {
      await purchase(planId);
      router.replace('/dashboard');
    } catch (e) {
      // Backing out of the store's purchase sheet is not an error worth alerting on.
      if (!e.userCancelled) Alert.alert('Purchase failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const sub = await restorePurchases();
      if (sub.active) return router.replace('/dashboard');
      Alert.alert('Nothing to restore', 'No active subscription was found for this account.');
    } catch (e) {
      Alert.alert('Restore failed', e.message);
    } finally {
      setBusy(false);
    }
  };

  const headline = subscribed
    ? 'You’re subscribed'
    : trialActive
      ? 'Enjoying HomeKept?'
      : 'Your free trial has ended';

  const blurb = subscribed
    ? 'Thanks for supporting HomeKept. Manage or cancel your plan any time in Google Play → Subscriptions.'
    : trialActive
      ? `You have ${access.daysLeft} day${access.daysLeft === 1 ? '' : 's'} of free trial left. Subscribe now and never miss a maintenance date.`
      : `Your ${TRIAL_DAYS}-day free trial is over. Subscribe to keep your personalized schedule, reminders, and maintenance record.`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.plaster }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Text style={{ fontSize: 40 }}>🏠</Text>
        <Text style={[type.h1, { marginTop: S.sm }]}>{headline}</Text>
        <Text style={[type.sub, { marginTop: S.xs, marginBottom: S.lg }]}>{blurb}</Text>

        <View style={styles.perks}>
          {[
            'Personalized seasonal schedule',
            'Reminders on every due date',
            'Maintenance history & spending log',
          ].map((p) => (
            <Text key={p} style={[type.body, { marginBottom: 4 }]}>✓  {p}</Text>
          ))}
        </View>

        {!subscribed && PLANS.map((p) => {
          const on = planId === p.id;
          return (
            <Pressable key={p.id} onPress={() => setPlanId(p.id)} style={[styles.plan, on && styles.planOn]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                  <Text style={[type.h2, on && { color: C.pine }]}>{p.label}</Text>
                  {p.badge && (
                    <View style={styles.badge}><Text style={styles.badgeText}>{p.badge}</Text></View>
                  )}
                </View>
                <Text style={type.sub}>{p.note}</Text>
              </View>
              <Text style={[styles.price, on && { color: C.pine }]}>
                {p.price}<Text style={type.sub}> / {p.per}</Text>
              </Text>
            </Pressable>
          );
        })}

        {!subscribed && (
          <>
            <Pressable onPress={buy} disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]}>
              <Text style={styles.ctaText}>{busy ? 'One moment…' : 'Subscribe'}</Text>
            </Pressable>
            <Text style={[type.sub, { textAlign: 'center', marginTop: S.sm }]}>
              {user ? `Signed in as ${user.email}. ` : ''}
              Billed through Google Play; cancel anytime. New subscribers get a{' '}
              {TRIAL_DAYS}-day free trial.
            </Text>
          </>
        )}

        {!subscribed && (
          <Pressable onPress={restore} style={{ padding: S.md, alignItems: 'center' }}>
            <Text style={{ color: C.inkSoft, fontWeight: '600' }}>Restore purchases</Text>
          </Pressable>
        )}

        {dismissable && (
          <Pressable onPress={leave} style={{ padding: S.sm, alignItems: 'center' }}>
            <Text style={{ color: C.inkSoft }}>
              {subscribed ? 'Back' : 'Not now — keep using my trial'}
            </Text>
          </Pressable>
        )}

        {access?.stale && (
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.sm }]}>
            We couldn’t reach the store to confirm your subscription, so we’re going by your
            last known status. Reconnect when you can.
          </Text>
        )}

        {isBillingUnavailable && (
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.md, color: C.ember }]}>
            Subscriptions are temporarily unavailable. Please try again later.
          </Text>
        )}

        {isMockBilling && (
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.md }]}>
            Dev billing: purchases are simulated. Real store billing activates in a production
            build with RevenueCat keys (lib/billing.js).
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: S.lg, paddingTop: S.xl },
  perks: {
    backgroundColor: C.okSoft, borderRadius: 14, padding: S.md, marginBottom: S.lg,
  },
  plan: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: 14,
    padding: S.md, marginBottom: S.sm + 2,
  },
  planOn: { borderColor: C.pine, backgroundColor: C.okSoft },
  badge: {
    backgroundColor: C.ember, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  price: { fontSize: 18, fontWeight: '700', color: C.ink },
  cta: {
    backgroundColor: C.pine, borderRadius: 14, padding: S.md, alignItems: 'center',
    marginTop: S.sm,
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

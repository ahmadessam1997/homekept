import { useCallback, useRef, useState } from 'react';
import {
  View, Text, SectionList, Pressable, StyleSheet, LayoutAnimation,
  Modal, TextInput, Alert,
} from 'react-native';
// react-native's own SafeAreaView is a no-op on Android, which let the header
// render under the status bar on this screen.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getProfile, getHistory, getLog, completeTask } from '../lib/storage';
import { buildSchedule, formatDue, bucketOf } from '../lib/schedule';
import { syncReminders } from '../lib/notifications';
import { getAccessState } from '../lib/entitlement';
import { C, S, type } from '../lib/theme';

// Keep only digits and a single decimal point so the parsed cost never becomes NaN.
function sanitizeCost(t) {
  const cleaned = t.replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

export default function Dashboard() {
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [pending, setPending] = useState(null); // task awaiting cost entry
  const [costText, setCostText] = useState('');
  const [access, setAccess] = useState(null);
  const [failed, setFailed] = useState(false);
  // In-flight completion. A ref, not state: an already-rendered Pressable keeps the
  // previous closure, so a state flag flips too late to block a second fast tap.
  const saving = useRef(false);

  // `alive` lets the caller cancel state writes after the screen is unmounted/blurred.
  const load = useCallback(async (alive = () => true) => {
    try {
      const profile = await getProfile();
      if (!profile) return router.replace('/onboarding');
      const acc = await getAccessState();
      if (!acc.ok) return router.replace('/paywall');
      if (!alive()) return;
      setAccess(acc);
      const history = await getHistory();
      const log = await getLog();
      if (!alive()) return;
      const items = buildSchedule(profile, history);
      setDoneCount(log.length); // completions, not distinct tasks — History shows the same list

      const buckets = { 'Up next': [], 'Coming up': [], 'Later this year': [] };
      items.forEach((i) => buckets[bucketOf(i)].push(i));
      setSections(
        Object.entries(buckets)
          .filter(([, data]) => data.length)
          .map(([title, data]) => ({ title, data })),
      );
      setFailed(false);
      syncReminders(items).catch(() => {});
    } catch (e) {
      // Without this the screen would sit empty forever, looking like an empty schedule.
      if (alive()) setFailed(true);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]));

  const confirmDone = async (cost) => {
    const item = pending;
    if (!item || saving.current) return; // double-tap guard: Save and Skip share this path
    saving.current = true;
    try {
      // Write first: closing the sheet before the write would show success for a task
      // that was never recorded.
      await completeTask(item, cost);
      setPending(null);
      setCostText('');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpenId(null);
      load();
    } catch (e) {
      // Nothing was stored; leave the sheet up so the entered cost survives the retry.
      saving.current = false;
      Alert.alert(
        "Couldn't save that",
        'We could not record this task on your device. Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={type.label}>Your home</Text>
          <Text style={type.h1}>HomeKept</Text>
        </View>
        <Pressable onPress={() => router.push('/spending')} style={styles.headBtn}>
          <Text style={styles.headBtnText}>Spending</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/history')} style={styles.headBtn}>
          <Text style={styles.headBtnText}>History</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/settings')} style={styles.headBtn}>
          <Text style={styles.headBtnText}>⚙︎</Text>
        </Pressable>
      </View>

      {failed ? (
        <View style={styles.retryWrap}>
          <Text style={{ fontSize: 34 }}>🧰</Text>
          <Text style={[type.h2, { marginTop: S.sm }]}>Your schedule didn't open</Text>
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
            Nothing was lost — your home profile and history are still on this device.
          </Text>
          <Pressable onPress={() => load()} style={styles.retryBtn}>
            <Text style={styles.doneBtnText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: S.md, paddingBottom: S.xl }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[type.label, { marginTop: S.md, marginBottom: S.sm }]}>{section.title}</Text>
          )}
          ListHeaderComponent={
            <>
              {access?.reason === 'trial' && (
                <Pressable onPress={() => router.push('/paywall')} style={styles.trial}>
                  <Text style={{ fontSize: 15 }}>⏳</Text>
                  <Text style={[type.sub, { flex: 1 }]}>
                    {'  '}Free trial — {access.daysLeft} day{access.daysLeft === 1 ? '' : 's'} left
                  </Text>
                  <Text style={{ color: C.pine, fontWeight: '700', fontSize: 13 }}>Subscribe</Text>
                </Pressable>
              )}
              {doneCount > 0 && (
                <View style={styles.streak}>
                  <Text style={{ fontSize: 15 }}>✅</Text>
                  <Text style={type.sub}>  {doneCount} task{doneCount === 1 ? '' : 's'} completed — your home thanks you.</Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => {
            const open = openId === item.id;
            return (
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setOpenId(open ? null : item.id);
                }}
                style={[styles.card, item.overdue && styles.cardOverdue]}
              >
                <View style={styles.cardRow}>
                  <Text style={{ fontSize: 22, marginRight: S.sm + 2 }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.body, { fontWeight: '600' }]}>{item.title}</Text>
                    <Text style={[type.sub, item.overdue && { color: C.ember, fontWeight: '600' }]}>
                      {formatDue(item)}{!item.diy ? '  ·  Pro recommended' : ''}
                    </Text>
                  </View>
                  <Text style={{ color: C.inkSoft }}>{open ? '▾' : '▸'}</Text>
                </View>

                {open && (
                  <View style={styles.detail}>
                    <Text style={type.sub}>{item.detail}</Text>
                    <Pressable
                      // Re-arm the guard here rather than after saving: the sheet stays
                      // touchable while it fades out, and that tap must not record twice.
                      onPress={() => { saving.current = false; setPending(item); setCostText(''); }}
                      style={styles.doneBtn}
                    >
                      <Text style={styles.doneBtnText}>Mark as done</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPending(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[type.h2, { marginBottom: S.xs }]}>Nice work!</Text>
            <Text style={[type.sub, { marginBottom: S.md }]}>
              Add what it cost (optional) to track your home spending over time.
            </Text>
            <View style={styles.costInputRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                value={costText}
                onChangeText={(t) => setCostText(sanitizeCost(t))}
                placeholder="0"
                placeholderTextColor={C.inkSoft}
                keyboardType="decimal-pad"
                style={styles.costInput}
                autoFocus
              />
            </View>
            <Pressable onPress={() => confirmDone(costText)} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Save</Text>
            </Pressable>
            <Pressable onPress={() => confirmDone(0)} style={styles.skip}>
              <Text style={{ color: C.inkSoft, fontWeight: '600' }}>Skip — no cost</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.plaster },
  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: S.md, paddingTop: S.md, paddingBottom: S.sm, gap: S.sm,
  },
  headBtn: {
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
  },
  headBtnText: { color: C.ink, fontWeight: '600', fontSize: 13 },
  streak: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.okSoft, borderRadius: 12, padding: S.sm + 4, marginBottom: S.xs,
  },
  trial: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.emberSoft, borderWidth: 1, borderColor: C.ember,
    borderRadius: 12, padding: S.sm + 4, marginBottom: S.sm,
  },
  card: {
    backgroundColor: C.card, borderRadius: 14, padding: S.md,
    marginBottom: S.sm + 2, borderWidth: 1, borderColor: C.line,
  },
  cardOverdue: { borderColor: C.ember, backgroundColor: C.emberSoft },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  detail: { marginTop: S.sm + 4, paddingTop: S.sm + 4, borderTopWidth: 1, borderTopColor: C.line },
  doneBtn: {
    marginTop: S.sm + 4, backgroundColor: C.pine, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700' },
  retryWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl },
  retryBtn: {
    marginTop: S.lg, backgroundColor: C.pine, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: S.lg, alignItems: 'center',
  },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(30,36,25,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.plaster, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: S.lg, paddingBottom: S.xl,
  },
  costInputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.line, borderRadius: 14,
    paddingHorizontal: S.md, marginBottom: S.md,
  },
  dollar: { fontSize: 26, color: C.inkSoft, fontWeight: '600' },
  costInput: { flex: 1, fontSize: 26, color: C.ink, paddingVertical: S.md, marginLeft: 4 },
  skip: { alignItems: 'center', paddingVertical: S.md },
});

import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getCosts } from '../lib/storage';
import { monthlySpend, spendSummary, money } from '../lib/spend';
import { C, S, type } from '../lib/theme';

export default function Spending() {
  const [costs, setCosts] = useState([]);
  const [failed, setFailed] = useState(false);

  // `alive` cancels the state write if the screen is gone by the time the read lands.
  const load = useCallback((alive = () => true) => {
    getCosts()
      .then((c) => { if (alive()) { setCosts(c); setFailed(false); } })
      .catch(() => { if (alive()) setFailed(true); }); // otherwise a read error reads as "no spending yet"
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]));

  const months = monthlySpend(costs, 6);
  const summary = spendSummary(costs);
  const peak = Math.max(1, ...months.map((m) => m.total));

  if (failed) {
    return (
      <ScrollView style={{ backgroundColor: C.plaster }} contentContainerStyle={styles.empty}>
        <Text style={{ fontSize: 34 }}>🧰</Text>
        <Text style={[type.h2, { marginTop: S.sm }]}>Your spending didn't load</Text>
        <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
          Nothing was lost — your records are still on this device.
        </Text>
        <Pressable onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (costs.length === 0) {
    return (
      <ScrollView style={{ backgroundColor: C.plaster }} contentContainerStyle={styles.empty}>
        <Text style={{ fontSize: 34 }}>📊</Text>
        <Text style={[type.h2, { marginTop: S.sm }]}>No spending logged yet</Text>
        <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
          When you mark a task done, add what it cost. HomeKept charts your home
          upkeep spending over time — handy for budgeting and at resale.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: C.plaster }} contentContainerStyle={{ padding: S.md }}>
      <View style={styles.cards}>
        <View style={styles.stat}>
          <Text style={type.label}>Last 12 mo</Text>
          <Text style={styles.statNum}>{money(summary.last12)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={type.label}>This year</Text>
          <Text style={styles.statNum}>{money(summary.thisYear)}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={type.label}>All time</Text>
          <Text style={styles.statNum}>{money(summary.total)}</Text>
        </View>
      </View>

      <Text style={[type.label, { marginTop: S.lg, marginBottom: S.sm }]}>Last 6 months</Text>
      <View style={styles.chart}>
        {months.map((m) => (
          <View key={m.key} style={styles.barCol}>
            <Text style={styles.barVal}>{m.total > 0 ? money(m.total) : ''}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.round((m.total / peak) * 100)}%`,
                    backgroundColor: m.total > 0 ? C.pine : 'transparent' },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[type.label, { marginTop: S.lg, marginBottom: S.sm }]}>Recent costs</Text>
      {costs.slice(0, 20).map((c, i) => (
        <View key={c.at + i} style={styles.row}>
          <Text style={{ fontSize: 20, marginRight: S.sm + 2 }}>{c.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { fontWeight: '600' }]}>{c.title}</Text>
            <Text style={type.sub}>
              {new Date(c.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.rowCost}>{money(c.cost)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: S.xl, marginTop: S.xl },
  retryBtn: {
    marginTop: S.lg, backgroundColor: C.pine, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: S.lg, alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  cards: { flexDirection: 'row', gap: S.sm },
  stat: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line,
    padding: S.md, gap: S.xs,
  },
  statNum: { fontSize: 20, fontWeight: '700', color: C.pine },
  chart: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.line,
    padding: S.md, height: 200,
  },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: 26, flex: 1, justifyContent: 'flex-end', marginTop: 4 },
  barFill: { width: '100%', borderRadius: 6, minHeight: 3 },
  barVal: { fontSize: 9, color: C.inkSoft, marginBottom: 2 },
  barLabel: { ...type.sub, marginTop: 6, fontSize: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: S.md, marginBottom: S.sm,
  },
  rowCost: { fontSize: 15, fontWeight: '700', color: C.ink },
});

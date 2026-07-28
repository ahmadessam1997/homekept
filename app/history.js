import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getLog } from '../lib/storage';
import { C, S, type } from '../lib/theme';

export default function History() {
  const [log, setLog] = useState([]);
  const [failed, setFailed] = useState(false);

  // `alive` cancels the state write if the screen is gone by the time the read lands.
  const load = useCallback((alive = () => true) => {
    getLog()
      .then((l) => { if (alive()) { setLog(l); setFailed(false); } })
      .catch(() => { if (alive()) setFailed(true); }); // otherwise a read error reads as "nothing done yet"
  }, []);

  useFocusEffect(useCallback(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]));

  if (failed) {
    return (
      <View style={[styles.empty, { flex: 1, marginTop: 0, justifyContent: 'center', backgroundColor: C.plaster }]}>
        <Text style={{ fontSize: 34 }}>🧰</Text>
        <Text style={[type.h2, { marginTop: S.sm }]}>Your history didn't load</Text>
        <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
          Nothing was lost — your record is still on this device.
        </Text>
        <Pressable onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: C.plaster }}
      contentContainerStyle={{ padding: S.md }}
      data={log}
      keyExtractor={(item, i) => item.at + i}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={{ fontSize: 34 }}>🗒️</Text>
          <Text style={[type.h2, { marginTop: S.sm }]}>No completed tasks yet</Text>
          <Text style={[type.sub, { textAlign: 'center', marginTop: S.xs }]}>
            Everything you mark as done builds a maintenance record of your home — useful for
            warranties and at resale.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={{ fontSize: 20, marginRight: S.sm + 2 }}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { fontWeight: '600' }]}>{item.title}</Text>
            <Text style={type.sub}>
              {new Date(item.at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
              })}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: S.xl, marginTop: S.xl },
  retryBtn: {
    marginTop: S.lg, backgroundColor: C.pine, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: S.lg, alignItems: 'center',
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, borderWidth: 1, borderColor: C.line,
    padding: S.md, marginBottom: S.sm,
  },
});

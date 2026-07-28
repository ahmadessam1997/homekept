import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PROFILE_QUESTIONS } from '../data/taskLibrary';
import { getProfile, saveProfile } from '../lib/storage';
import { C, S, type } from '../lib/theme';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ features: [] });
  const [saveFailed, setSaveFailed] = useState(false);
  const advanceTimer = useRef(null);
  const saving = useRef(false);
  const touched = useRef(false);
  const q = PROFILE_QUESTIONS[step];
  const last = step === PROFILE_QUESTIONS.length - 1;

  // Clear any pending auto-advance timer if the screen unmounts mid-transition.
  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  // Re-running setup from Settings must start from the saved profile — finish() saves the
  // whole object, so a blank start would wipe answers the user never revisited. Loaded
  // async so the first question paints immediately: first run has nothing to wait for.
  useEffect(() => {
    let alive = true;
    getProfile()
      .then((p) => {
        if (alive && p && !touched.current) setAnswers((a) => ({ ...a, ...p }));
      })
      .catch(() => {}); // unreadable profile is the first-run case: a blank form is correct
    return () => { alive = false; };
  }, []);

  const pick = (value) => {
    touched.current = true; // never let a late profile load overwrite a live answer
    if (q.multi) {
      const cur = answers.features || [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      setAnswers({ ...answers, features: next });
    } else {
      const next = { ...answers, [q.key]: value };
      setAnswers(next);
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(
        () => (last ? finish(next) : setStep((s) => s + 1)),
        150,
      );
    }
  };

  // Called un-awaited (from the auto-advance timer and the CTA), so it must swallow
  // its own failures — an unhandled rejection would leave the user stuck with no feedback.
  const finish = async (finalAnswers) => {
    if (saving.current) return;
    saving.current = true;
    setSaveFailed(false);
    try {
      await saveProfile(finalAnswers);
      router.replace('/dashboard');
    } catch (e) {
      saving.current = false;
      setSaveFailed(true);
    }
  };

  const selected = (value) =>
    q.multi ? (answers.features || []).includes(value) : answers[q.key] === value;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={type.label}>Set up your home · {step + 1} of {PROFILE_QUESTIONS.length}</Text>
        <Text style={[type.h1, { marginTop: S.sm, marginBottom: S.lg }]}>{q.label}</Text>

        {q.options.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => pick(opt.value)}
            style={[styles.option, selected(opt.value) && styles.optionOn]}
          >
            <Text style={[styles.optionText, selected(opt.value) && styles.optionTextOn]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}

        <View style={{ flex: 1 }} />
        {saveFailed && (
          <View style={styles.notice}>
            <Text style={[type.sub, { flex: 1 }]}>
              We couldn't save your home profile. Your answers are still here.
            </Text>
            <Pressable onPress={() => finish(answers)} hitSlop={8}>
              <Text style={styles.noticeAction}>Try again</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.footer}>
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={styles.back}>
              <Text style={{ color: C.inkSoft, fontWeight: '600' }}>Back</Text>
            </Pressable>
          )}
          {q.multi && (
            <Pressable onPress={() => finish(answers)} style={styles.cta}>
              <Text style={styles.ctaText}>Build my schedule</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.plaster },
  wrap: { flex: 1, padding: S.lg, paddingTop: S.xl },
  option: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.line,
    borderRadius: 14,
    padding: S.md,
    marginBottom: S.sm + 2,
  },
  optionOn: { borderColor: C.pine, backgroundColor: C.okSoft },
  optionText: { ...type.body, fontSize: 16 },
  optionTextOn: { fontWeight: '600', color: C.pine },
  notice: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.emberSoft, borderWidth: 1, borderColor: C.ember,
    borderRadius: 12, padding: S.sm + 4, marginBottom: S.md,
  },
  noticeAction: { color: C.pine, fontWeight: '700', fontSize: 13 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  back: { padding: S.md },
  cta: {
    flex: 1,
    backgroundColor: C.pine,
    borderRadius: 14,
    padding: S.md,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

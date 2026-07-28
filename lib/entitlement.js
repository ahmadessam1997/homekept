// Access control: 14-day free trial (starts when the account is created), then a
// subscription is required.
//
// The on-device trial clock is the dev/first-line gate. In production the store
// subscription itself also carries a 14-day free trial offer, which Google/Apple
// enforce once per store account — that covers uninstall/reinstall abuse without
// any server code (see README).
//
// Note: the trial keys deliberately live outside storage.js KEYS so
// "Reset all data" in Settings does NOT restart the trial.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSubscription, _devClearSubscription } from './billing';

export const TRIAL_DAYS = 14;
const TRIAL_KEY = 'hk.trialStart';
// Monotonic high-water mark of wall-clock time we have observed. Without it,
// winding the device clock back makes elapsed time negative and the trial
// renewable forever.
const SEEN_KEY = 'hk.trialSeen';
// Last successful subscription check, so a network/store failure can't lock a
// paying subscriber out of an app whose data is entirely on-device.
const SUB_CACHE_KEY = 'hk.subCache';
const OFFLINE_GRACE_DAYS = 7;

const DAY_MS = 86400000;

// Start the trial clock the first time an account is created on this device.
// Deliberately NOT called on app launch: the user signs in first, so nobody
// burns trial days before they have an account. It is also never reset, so
// registering a second email on the same device does not buy another trial.
export async function ensureTrialStarted() {
  const existing = await AsyncStorage.getItem(TRIAL_KEY);
  if (!existing) await AsyncStorage.setItem(TRIAL_KEY, new Date().toISOString());
}

// Returns the current time, floored at the latest time we have ever seen, and
// advances that high-water mark. Defeats a backwards device clock.
async function monotonicNow() {
  const now = Date.now();
  const seenRaw = await AsyncStorage.getItem(SEEN_KEY);
  const seen = Number(seenRaw);
  const effective = Number.isFinite(seen) && seen > now ? seen : now;
  if (effective !== seen) await AsyncStorage.setItem(SEEN_KEY, String(effective));
  return effective;
}

async function cacheSubscription(sub) {
  await AsyncStorage.setItem(
    SUB_CACHE_KEY,
    JSON.stringify({ active: !!sub.active, plan: sub.plan, at: Date.now() }),
  );
}

async function cachedSubscription() {
  const raw = await AsyncStorage.getItem(SUB_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// { ok, reason: 'subscribed' | 'trial' | 'expired', daysLeft?, plan?, stale? }
export async function getAccessState() {
  let sub = null;
  try {
    sub = await getSubscription();
    await cacheSubscription(sub);
  } catch {
    // Store/network hiccup. Honour a recent "subscribed" answer rather than
    // falling through to the trial clock, which would read as expired for any
    // subscriber who installed more than TRIAL_DAYS ago.
    const cached = await cachedSubscription();
    if (cached?.active && Date.now() - cached.at < OFFLINE_GRACE_DAYS * DAY_MS) {
      return { ok: true, reason: 'subscribed', plan: cached.plan, stale: true };
    }
  }
  if (sub?.active) return { ok: true, reason: 'subscribed', plan: sub.plan };

  const start = await AsyncStorage.getItem(TRIAL_KEY);
  const startMs = start ? new Date(start).getTime() : NaN;
  if (Number.isNaN(startMs)) {
    // Missing or corrupted timestamp — (re)start the clock instead of locking the
    // user out forever (NaN math would otherwise read as 'expired').
    await AsyncStorage.setItem(TRIAL_KEY, new Date().toISOString());
    return { ok: true, reason: 'trial', daysLeft: TRIAL_DAYS };
  }
  const now = await monotonicNow();
  const elapsedDays = (now - startMs) / DAY_MS;
  const daysLeft = Math.min(TRIAL_DAYS, Math.ceil(TRIAL_DAYS - elapsedDays));
  if (daysLeft > 0) return { ok: true, reason: 'trial', daysLeft };
  return { ok: false, reason: 'expired' };
}

// Dev helper (Settings dev row): jump the trial clock so the paywall is testable.
export async function _devSetTrialDaysAgo(days) {
  const d = new Date(Date.now() - days * DAY_MS);
  await AsyncStorage.setItem(TRIAL_KEY, d.toISOString());
  // Clear the high-water mark too, or it would be read as a backwards clock.
  await AsyncStorage.removeItem(SEEN_KEY);
}

// Dev helper: back to a clean day-one trial, including the offline grace cache
// (which would otherwise keep granting access for OFFLINE_GRACE_DAYS).
export async function _devResetAccess() {
  await AsyncStorage.multiRemove([TRIAL_KEY, SEEN_KEY, SUB_CACHE_KEY]);
  await _devClearSubscription();
  await ensureTrialStarted();
}

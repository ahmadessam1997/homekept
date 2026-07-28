// Subscription billing.
//
// Production: RevenueCat (react-native-purchases) on top of Google Play Billing /
// StoreKit. Digital subscriptions MUST go through the stores — configure the
// products there (see README) and paste your RevenueCat public API keys below.
//
// Development / Expo Go: native billing modules can't run, so a mock entitlement
// stored on-device stands in. Purchases succeed instantly so the whole
// trial → paywall → subscribe flow is testable in the emulator.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// ── 1. Paste your RevenueCat public API keys here (app.revenuecat.com) ──────
const RC_ANDROID_KEY = 'YOUR-RC-ANDROID-KEY';
const RC_IOS_KEY = 'YOUR-RC-IOS-KEY';
const ENTITLEMENT_ID = 'plus'; // RevenueCat entitlement identifier
// ────────────────────────────────────────────────────────────────────────────

export const PLANS = [
  {
    id: 'annual',
    label: 'Annual',
    price: '$24.99',
    per: 'year',
    note: 'About $2.08 / month',
    badge: 'SAVE 48%',
    rcPackage: '$rc_annual',
  },
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$3.99',
    per: 'month',
    note: 'Cancel anytime',
    rcPackage: '$rc_monthly',
  },
];

const MOCK_KEY = 'hk.sub.mock';
const inExpoGo = Constants.executionEnvironment === 'storeClient';
const rcKey = Platform.OS === 'android' ? RC_ANDROID_KEY : RC_IOS_KEY;
const keysMissing = rcKey.startsWith('YOUR-');

// The mock is a DEVELOPMENT convenience only. It must never be reachable in a
// store build: there, unset keys previously meant "tap Subscribe → free
// lifetime access", i.e. a paywall that takes no money. A misconfigured release
// now fails closed and loudly instead (see `assertUsable`).
export const isMockBilling = keysMissing && (__DEV__ || inExpoGo);
export const isBillingUnavailable = keysMissing && !isMockBilling;

function assertUsable() {
  if (isBillingUnavailable) {
    throw new Error('Subscriptions are temporarily unavailable. Please try again later.');
  }
}

// Corrupt JSON must not throw out of the launch path (same rule as storage.js).
function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

let rcConfigured = false;
function purchasesSDK() {
  const Purchases = require('react-native-purchases').default;
  if (!rcConfigured) {
    Purchases.configure({ apiKey: rcKey });
    rcConfigured = true;
  }
  return Purchases;
}

// ---- Public API ----

// { active: boolean, plan?: 'monthly' | 'annual' }
export async function getSubscription() {
  if (isMockBilling) {
    return safeParse(await AsyncStorage.getItem(MOCK_KEY), { active: false });
  }
  assertUsable();
  const info = await purchasesSDK().getCustomerInfo();
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  return ent ? { active: true, plan: ent.productIdentifier } : { active: false };
}

export async function purchase(planId) {
  if (isMockBilling) {
    await AsyncStorage.setItem(MOCK_KEY, JSON.stringify({ active: true, plan: planId }));
    return { active: true, plan: planId };
  }
  assertUsable();
  const Purchases = purchasesSDK();
  const offerings = await Purchases.getOfferings();
  const plan = PLANS.find((p) => p.id === planId);
  const pkg = offerings.current?.availablePackages.find((p) => p.identifier === plan.rcPackage);
  if (!pkg) throw new Error('Subscription plans are not available right now.');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
  if (!active) throw new Error('Purchase did not complete.');
  return { active: true, plan: planId };
}

export async function restorePurchases() {
  if (isMockBilling) return getSubscription();
  assertUsable();
  const info = await purchasesSDK().restorePurchases();
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  return ent ? { active: true, plan: ent.productIdentifier } : { active: false };
}

// Dev helper (Settings dev row): clear the mock subscription.
export async function _devClearSubscription() {
  await AsyncStorage.removeItem(MOCK_KEY);
}

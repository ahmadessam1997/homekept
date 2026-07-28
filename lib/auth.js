// Account layer. Signing in is required before the app can be used, so this
// module is on the critical path for every launch.
//
// Production backend: Supabase (free tier) — paste your two project keys below
// (supabase.com → Project Settings → API). Google sign-in additionally needs the
// OAuth *web* client ID (see README §2b); it is exchanged for a Supabase session.
// Until keys are set, a local mock account store keeps every flow testable in
// development. The mock is DEV-ONLY — see `assertUsable()`.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── 1. Paste your keys here ─────────────────────────────────────────────────
const SUPABASE_URL = 'YOUR-PROJECT-URL';   // e.g. https://abcd1234.supabase.co
const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';
// Google Cloud → Credentials → OAuth client of type **Web application**.
// (The Android client must also exist and carry the release SHA-1, but it is the
// web client ID that both Google Sign-In and Supabase expect here.)
const GOOGLE_WEB_CLIENT_ID = 'YOUR-GOOGLE-WEB-CLIENT-ID';
// ────────────────────────────────────────────────────────────────────────────

// Native Google Sign-In can't load in Expo Go — it needs a dev/production build.
const inExpoGo = Constants.executionEnvironment === 'storeClient';

export const isConfigured = !SUPABASE_URL.startsWith('YOUR-');
export const isGoogleConfigured =
  !GOOGLE_WEB_CLIENT_ID.startsWith('YOUR-') && !inExpoGo;

// A release build that reached the store without keys must fail loudly rather
// than quietly signing people into a device-local mock account.
const mockAllowed = __DEV__ || inExpoGo;
function assertUsable() {
  if (!isConfigured && !mockAllowed) {
    throw new Error('Accounts are temporarily unavailable. Please try again later.');
  }
}

let client = null;
function supabase() {
  if (!client) {
    const { createClient } = require('@supabase/supabase-js');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

let googleConfigured = false;
function googleSDK() {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  if (!googleConfigured) {
    // scopes/offlineAccess default to what Supabase needs (an ID token).
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
    googleConfigured = true;
  }
  return GoogleSignin;
}

// ---- Mock fallback (dev only; plaintext, on-device) ----
const MOCK_USERS = 'hk.mock.users';
const MOCK_SESSION = 'hk.mock.session';

// Corrupt JSON on device must never crash the launch path (same rule as storage.js).
function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function mockUsers() {
  return safeParse(await AsyncStorage.getItem(MOCK_USERS), {});
}

// ---- Public API ----

// Returns { email, id } or null.
export async function getUser() {
  if (isConfigured) {
    const { data } = await supabase().auth.getUser();
    return data?.user ? { email: data.user.email, id: data.user.id } : null;
  }
  if (!mockAllowed) return null;
  return safeParse(await AsyncStorage.getItem(MOCK_SESSION), null);
}

// Returns { needsConfirm } when Supabase email confirmation is enabled.
export async function signUp(email, password) {
  assertUsable();
  if (isConfigured) {
    const { data, error } = await supabase().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { needsConfirm: !data.session };
  }
  const users = await mockUsers();
  if (users[email]) throw new Error('An account with this email already exists.');
  users[email] = { password };
  await AsyncStorage.setItem(MOCK_USERS, JSON.stringify(users));
  await AsyncStorage.setItem(MOCK_SESSION, JSON.stringify({ email, id: `mock:${email}` }));
  return { needsConfirm: false };
}

export async function signIn(email, password) {
  assertUsable();
  if (isConfigured) {
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return;
  }
  const users = await mockUsers();
  if (!users[email] || users[email].password !== password) {
    throw new Error('Wrong email or password.');
  }
  await AsyncStorage.setItem(MOCK_SESSION, JSON.stringify({ email, id: `mock:${email}` }));
}

// Native Google Sign-In → ID token → Supabase session. The native flow is used
// rather than a browser redirect because Google rejects custom-scheme redirects
// for web OAuth clients, which is the failure mode a browser flow hits here.
export async function signInWithGoogle() {
  assertUsable();
  if (isGoogleConfigured) {
    const GoogleSignin = googleSDK();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    // v13+ returns { type, data }; older shapes put the token at the top level.
    const idToken = res?.data?.idToken ?? res?.idToken;
    if (!idToken) throw new Error('Google sign-in was cancelled.');
    if (!isConfigured) return; // Google configured but Supabase isn't — dev only.
    const { error } = await supabase().auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw new Error(error.message);
    return;
  }
  if (!mockAllowed) {
    throw new Error('Google sign-in is not available in this build.');
  }
  // Dev stand-in so the gate is testable in Expo Go, where the native module
  // cannot load. Clearly marked so it can never be mistaken for a real session.
  const email = 'dev.google.user@example.com';
  await AsyncStorage.setItem(
    MOCK_SESSION,
    JSON.stringify({ email, id: `mock:${email}`, provider: 'google' }),
  );
}

export async function signOut() {
  if (isConfigured) {
    await supabase().auth.signOut();
  } else {
    await AsyncStorage.removeItem(MOCK_SESSION);
  }
  if (isGoogleConfigured) {
    // Ignore: a signed-out Google SDK throws, and it must not block our sign-out.
    try { await googleSDK().signOut(); } catch {}
  }
}

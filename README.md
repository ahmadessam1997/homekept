# HomeKept 🏠

A personalized home maintenance schedule app. The user answers 5 quick questions about
their home; the app generates a seasonal task schedule, sends reminders, and keeps a
maintenance history. The home data itself stays on-device; an account (email or Google)
is required to sign in, and a subscription is required after the 14-day trial.

Built with **Expo (React Native)** — one codebase for both **Android** and **iOS**.

---

## 1. Run it on your laptop (10 minutes)

Prerequisites (one-time):
1. Install **Node.js LTS** from https://nodejs.org
2. Install the **Expo Go** app on your phone (Play Store / App Store)

Then, in a terminal:

```bash
cd homekept
npm install
npx expo start
```

A QR code appears. Scan it with your phone (Expo Go on Android, Camera app on iOS).
The app loads live on your phone — edit any file and it hot-reloads.

> Tip: `npx expo start --web` runs a rough web preview in the browser too.

## 2. Project map

```
app/                 Screens (expo-router: file = route)
  index.js           Entry gate — routes to auth, onboarding, dashboard or paywall
  onboarding.js      5-question home profile setup
  dashboard.js       Personalized schedule, mark-done, reminders
  history.js         Completed-task log
  settings.js        Edit profile / reset
data/taskLibrary.js  ⭐ THE BRAIN — all tasks + their rules. Add tasks here.
lib/schedule.js      Filters tasks by profile, computes due dates
lib/storage.js       On-device persistence (AsyncStorage)
lib/notifications.js Local push reminders
lib/theme.js         Colors, spacing, type
```

To grow the app, you mostly just add entries to `data/taskLibrary.js` — the
schedule, reminders, and UI pick them up automatically.

New monetization files:

```
app/auth.js          The sign-in gate — email/password or Continue with Google
app/paywall.js       Subscription paywall ($3.99/mo, $24.99/yr)
lib/auth.js          Supabase auth + native Google sign-in (mock fallback in dev)
lib/billing.js       RevenueCat billing (simulated in dev / Expo Go)
lib/entitlement.js   14-day trial clock + access gate
```

## 2b. Accounts & subscription — how it works

- **Sign-in is required up front.** The first screen is `app/auth.js` — create an
  account with email + password, or **Continue with Google**. `app/index.js`
  enforces the order: account → home profile → schedule.
- **14-day free trial starts when the account is created**, not when the app is
  installed, so browsing the sign-in screen never costs the user a day. The clock
  is never reset, so registering a second email on the same device does not buy a
  second trial.
- When the trial ends, the app routes to the **paywall** and the schedule is
  locked until the user subscribes.
- A **trial banner** on the dashboard counts down and upsells early.
- "Reset all data" in Settings does **not** restart the trial (trial keys are
  stored separately from app data).
- Local trial state is wiped on uninstall — that's fine, because in production
  the store subscription itself carries a **14-day free trial offer** which
  Google/Apple enforce **once per store account**. Reinstalling can re-lock the
  app but can never grant a second free trial.

### Going live checklist

Nothing below is optional. In a **release** build, unset keys no longer fall back
to the dev mock — accounts and purchases fail loudly instead. That is deliberate:
the old behaviour meant a shipped app would hand out free lifetime access.

1. **Supabase (accounts)** — create a free project at https://supabase.com, then
   paste the project URL + anon key at the top of `lib/auth.js`.
2. **Google sign-in** — in Google Cloud → APIs & Services → Credentials create
   **two** OAuth clients:
   - **Web application** → paste its client ID into `GOOGLE_WEB_CLIENT_ID` in
     `lib/auth.js` (this is the one both Google Sign-In and Supabase expect).
   - **Android** → package `com.ahmadessam.homekept`, with the SHA-1 of the EAS
     upload key **and** the Play App Signing SHA-1 (Play Console → App integrity).
     Sign-in works on the Play-installed build only once the app-signing SHA-1 is
     registered.
   Then enable the **Google provider** in Supabase → Authentication → Providers
   and give it the same web client ID.
3. **Store products (billing)** — in Play Console create a subscription
   `homekept_plus` with two base plans:
   - monthly `$3.99`
   - annual `$24.99`

   **Do NOT attach a free-trial intro offer to these.** The 14-day trial is
   already granted in-app before the paywall; a store trial on top would hand
   new users 28 free days. (An earlier draft of this file said to add one —
   that was wrong, and `store/play-listing.md` has always said otherwise.)

   The cost of that choice: the local trial clock is wiped on uninstall, so a
   determined user can reinstall for another 14 days. Now that an account is
   mandatory, the durable fix is to store `trialStart` per user in Supabase and
   have `lib/entitlement.js` prefer the server value — worth doing once the
   Supabase keys are in, and the reason the trial clock is keyed to the account
   rather than the install.
4. **RevenueCat** — free account at https://www.revenuecat.com, connect Play,
   create an entitlement `plus` with packages `$rc_monthly` / `$rc_annual`, then
   paste the public API key into `lib/billing.js`.
5. **Build** — native Google sign-in and billing cannot run in Expo Go:
   `eas build --profile development --platform android` to test them, and
   `--profile production` for the AAB you upload.
6. **Privacy policy** — accounts mean you collect an email address. Host a privacy
   policy and a **web-based account-deletion URL** (Play requires one for any app
   with accounts — in-app sign-out is not sufficient), and make sure the Play
   **data safety form matches the policy**; a mismatch gets releases rejected.

### Build notes (learned the hard way on the sibling projects)

- **EAS builds from git.** The project is a git repo; commit before every build or
  the cloud build ships the last committed state, not your working tree.
- **versionCode is remote-managed** (`appVersionSource: "remote"` +
  `autoIncrement` in `eas.json`), so it is deliberately absent from `app.json`.
  Never hand-set it locally — a stale local value produces AABs Play rejects as
  duplicates.
- **Never build the AAB locally with `gradlew bundleRelease`.** The upload key is
  managed by EAS; a locally-signed bundle is rejected on upload.
- **Play Billing Library:** `react-native-purchases@10.4.x` → `purchases-android
  10.11.0` → `billingclient 8.3.0`, i.e. already compliant, on `kotlin-stdlib
  2.0.21` which matches Expo SDK 53. Do not "fix" this by upgrading the Expo SDK.

Pricing rationale: comparable home-maintenance apps charge $3–5/mo. $3.99/mo
anchors the $24.99/yr plan (~48% off) — annual is the plan to push, since home
maintenance is a year-round cycle and annual subs minimize churn.

## 3. Publish to Google Play (recommended first)

1. Create a Google Play developer account ($25 one-time): https://play.google.com/console
2. Package id is already set to `com.ahmadessam.homekept` (`android.package` +
   `ios.bundleIdentifier`). It is permanent once uploaded.
3. Create a free Expo account at https://expo.dev, then:

```bash
npm install -g eas-cli
eas login                       # or set EXPO_TOKEN (expo.dev → Access Tokens)
eas build --platform android --profile production   # signed .aab in the cloud
```

4. Download the `.aab` from the link EAS prints, upload it in Play Console →
   create your store listing (screenshots, description) → submit for review.
   First review typically takes a few days; Google also requires a small
   closed-testing phase for new personal accounts (~14 days with 12 testers).

## 4. Publish to Apple App Store (after Android traction)

1. Apple Developer Program ($99/year): https://developer.apple.com
2. `eas build --platform ios` then `eas submit --platform ios`
3. Fill out the App Store listing in App Store Connect and submit for review.

## 5. Suggested roadmap (premium tier ideas)

- Appliance & warranty vault (photo capture of model stickers)
- Cost / service-provider log
- Multi-home support (landlords — highest-value users)
- CSV export (be the anti-Centriq: users own their data)
- Paywall: RevenueCat is the standard for React Native subscriptions

## Notes

- Local notifications fire at 9:00 AM on each task's due date (up to 20 scheduled).
- Home profile, history, and costs are stored on-device via AsyncStorage. The
  account (email address) is the only thing that leaves the device, so a privacy
  policy **is** required — see the go-live checklist.

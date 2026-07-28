# HomeKept — go-live runbook

Ordered because each step feeds the next. Nothing here is optional: a release
build with unset keys **fails closed** (the sign-in gate shows "Accounts are
temporarily unavailable"), which is deliberate — the old behaviour was to
silently fall back to a dev mock that gave away free lifetime access.

Fixed values used throughout:

| Thing | Value |
|---|---|
| Android package / iOS bundle id | `com.ahmadessam.homekept` |
| Expo account | `ahmadessam1997` (eas-cli already logged in) |
| Play subscription id | `homekept_plus` |
| Base plans | `monthly` $3.99 · `annual` $24.99 |
| RevenueCat entitlement | `plus` |
| RevenueCat packages | `$rc_monthly`, `$rc_annual` |

---

## 1. Supabase — accounts

1. supabase.com → new project (free tier), any region near your users.
2. Project Settings → API → copy **Project URL** and the **anon / public** key.
3. Paste both into `lib/auth.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
4. Authentication → Providers → **Email**: leave enabled. Decide whether to
   require email confirmation — the app already handles the confirm-then-sign-in
   path (`signUp` returns `needsConfirm`).

**Check:** `isConfigured` in `lib/auth.js` becomes true, and the "Dev mode:
accounts are stored on this device only" line disappears from the sign-in screen.

## 2. Google Cloud — Google sign-in

Needs **two** OAuth clients. This is the step both sibling projects got wrong.

1. console.cloud.google.com → APIs & Services → **OAuth consent screen**: external,
   app name HomeKept, support email, and the privacy-policy URL from step 5.
2. Credentials → Create credentials → OAuth client ID → **Web application**.
   Copy its client ID into `GOOGLE_WEB_CLIENT_ID` in `lib/auth.js`.
   *(Yes, the web client — that is what both Google Sign-In and Supabase expect.)*
3. Credentials → Create credentials → OAuth client ID → **Android**.
   - Package name: `com.ahmadessam.homekept`
   - SHA-1: **both** the EAS upload-key SHA-1 and the Play app-signing SHA-1.
     - EAS one: `eas credentials -p android` → Keystore → shows the fingerprint.
     - Play one: Play Console → your app → **App integrity** → App signing key
       certificate. This one only exists after the first upload, so come back and
       add it — sign-in on Play-installed builds fails until you do.
4. Supabase → Authentication → Providers → **Google** → enable, paste the same
   **web** client ID (and its secret).

**Do not** use a browser/redirect OAuth flow here. The app uses native Google Play
services sign-in on purpose: redirect flows were tried on both sibling projects
and Google rejects the custom-scheme redirect for web clients.

## 3. Play Console — app + subscription

1. play.google.com/console → Create app → HomeKept, App, Free (the subscription
   is in-app), declare it contains ads: **No**.
2. Monetize → Products → **Subscriptions** → Create:
   - Product ID `homekept_plus`
   - Base plan `monthly`, auto-renewing, $3.99
   - Base plan `annual`, auto-renewing, $24.99
   - **No free-trial offer on either.** The 14 days are already granted in-app;
     a store trial on top would give new users 28 free days.
   - Activate both base plans.
3. Setup → License testing → add your test Gmail addresses, so purchases run in
   test mode without real charges.

## 4. RevenueCat — billing

1. app.revenuecat.com → new project → add app → **Google Play Store**,
   package `com.ahmadessam.homekept`.
2. It needs a Google service account JSON with Play access. Play Console →
   Users and permissions → invite the service account and grant: *View app
   information*, *View financial data*, *Manage orders and subscriptions*.
   (On the sibling project the "API access" page never loaded and bounced to the
   app list — Users and permissions worked instead.)
3. Import products `homekept_plus:monthly` and `homekept_plus:annual`.
4. Create entitlement **`plus`**; attach both products.
5. Create offering **`default`** with packages `$rc_monthly` and `$rc_annual`.
6. API keys → copy the **public Google** key (`goog_…`) into `RC_ANDROID_KEY` in
   `lib/billing.js`.

**Check:** `isMockBilling` is false and `isBillingUnavailable` is false.

## 5. Host the legal pages

`docs/privacy-policy.html` and `docs/delete-account.html` are written and ready.
They need to be publicly reachable. Simplest: push this repo to GitHub and turn on
**Pages → Deploy from branch → /docs**, giving:

- `https://<user>.github.io/homekept/privacy-policy.html`
- `https://<user>.github.io/homekept/delete-account.html`

Then in Play Console → App content:
- **Privacy policy** → the first URL.
- **Data deletion** → the second URL. Play requires a *web* deletion route for any
  app with accounts; in-app sign-out does not satisfy it.
- **Data safety form** must match the policy exactly or the release is rejected:
  email collected, linked to the user, used for account management; purchase
  history collected; everything else (home profile, history, costs) stays on the
  device and is *not* collected.

Neither document has been reviewed by a lawyer — read them before publishing.

## 6. Build and upload

```bash
git add -A && git commit -m "Add production keys"   # EAS builds from git
npx eas-cli build --platform android --profile production
```

versionCode is remote-managed (`appVersionSource: remote` + `autoIncrement`), so
never set it by hand and never build the AAB with `gradlew bundleRelease` — the
upload key lives in EAS, and a locally-signed bundle is rejected on upload.

Upload the AAB to **Closed testing** (not Internal — internal does not count
toward the 12-tester rule).

## 7. Verify what the emulator could not

Everything below is unproven so far, because Expo Go can only run the dev mocks:

- Google sign-in end to end, on a build installed **from Play**.
- A real purchase with a license-tester account, both plans.
- Restore purchases after reinstalling.
- The 9 AM reminder actually firing (needs a dev build, not Expo Go).

## 8. Closed test

Personal Play accounts need **12+ testers for 14 continuous days** before
production. Sibling project used testerscommunity.com for this. Consider a shared
throwaway test account with a RevenueCat promotional entitlement granted to it, so
testers do not hit the paywall mid-test.

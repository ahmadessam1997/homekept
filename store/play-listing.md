# HomeKept — Google Play listing (rewritten 2026-07-11)

**App name (30 chars max):** `HomeKept: Home Maintenance` (26)
**Package:** (set at EAS build — use com.ahmadessam.homekept)

## Short description (80 chars max)
`Your home, on schedule: seasonal maintenance tasks, reminders & spending log.` (77)

## Full description
Your home takes care of you. HomeKept helps you return the favor. 🏠

Answer five quick questions about your home — house or condo, yard or not,
heating type — and HomeKept builds a personalized seasonal maintenance
schedule: what to do, when to do it, and exactly why it matters.

✅ A SCHEDULE THAT KNOWS YOUR HOME
• Only the tasks that apply to YOUR home — no lawn care for apartment dwellers
• Each task explains the why ("a clogged filter strains the blower and raises
  energy bills") and how often
• Overdue, due-today and coming-up buckets so you always know what's next

🔔 REMINDERS THAT ACTUALLY REMIND
• A nudge on the morning a task comes due — nothing spammy

🧾 A LOGBOOK YOUR FUTURE SELF WILL THANK YOU FOR
• Mark tasks done and (optionally) what they cost
• Spending dashboard: last 12 months, this year, all-time, by month
• A maintenance history that's gold for warranties — and for resale day

🔒 YOUR DATA STAYS HOME
Your home profile, history and spending live on your device. Your account —
email or Google — is used only for sign-in and to keep your subscription with
you across devices.

💚 TRY EVERYTHING FREE FOR 14 DAYS
Create a free account (email or Google) and the whole app is yours for 14 days.
No credit card needed to start. After the trial: $3.99/month or $24.99/year
(about $2.08/month, save 48%). Billing is handled securely by Google Play;
cancel anytime.

Five questions now. A calmer, better-kept home all year.

## Screenshot captions (rendered into play-assets/screenshot-1..7.png)
Reshot 2026-07-28 from the real app on the emulator, after sign-in became
mandatory. Upload in this order — the first one is what most people see.
1. YOUR HOME, ON SCHEDULE
2. KNOW WHAT TO DO — AND WHY
3. TRACK WHAT UPKEEP COSTS
4. SEE SPENDING AT A GLANCE
5. A LOGBOOK FOR RESALE DAY
6. START FREE IN SECONDS          (the sign-in gate — new)
7. 14 DAYS FREE, THEN $24.99/YEAR (the paywall, so pricing is visible up front)

## Play Console answers
- **Category:** House & Home (or Lifestyle)
- **Content rating:** Everyone
- **Data safety:** Account email collected (authentication; Supabase) — now
  REQUIRED to use the app, and optionally supplied by Google Sign-In (email +
  basic profile). Purchases processed by Google Play / RevenueCat. Home profile,
  tasks, history and spending are stored on-device only. No ads, no data sold,
  no location. Declare the email as collected, linked to the user, and used for
  "Account management" — the form must match the hosted privacy policy or the
  release gets rejected.
- **Account deletion URL:** REQUIRED for any app with accounts. Play needs a
  publicly reachable web page to request deletion; in-app sign-out is not enough.
- **In-app products:** subscription `homekept_monthly` $3.99/mo,
  `homekept_yearly` $24.99/yr — the 14-day free trial is handled in-app with
  NO card, so configure the Play subscriptions WITHOUT an extra intro trial.

## Asset inventory
- `play-assets/screenshot-1..7.png` — 1080×1920 framed shots (REAL captures from
  the Android emulator, 2026-07-28) · `feature-graphic.png` 1024×500
- `play-assets/play-icon-512.png`, `icon-1024.png` — house + gold checkmark
- `play-assets/raw/` — unframed 1080×2400 captures (dashboard, task-expanded,
  cost-modal, spending, history, auth, paywall, settings)

## Remaining blockers before submission
1. Supabase keys in `lib/auth.js`. No longer optional: sign-in is mandatory, and
   a release build with unset keys now fails closed rather than falling back to
   the on-device mock.
2. Google OAuth client IDs — web client ID into `lib/auth.js`, Android client
   registered with both the EAS upload SHA-1 and the Play app-signing SHA-1.
3. RevenueCat products + API key in `lib/billing.js` (billing simulated in dev).
4. EAS build (dev-client/production) — Expo Go can't ship RevenueCat or native
   Google sign-in.
5. Terms/Privacy URLs (the sign-up screen references them; none hosted yet) plus
   the account-deletion URL above.
6. Closed test (12+ testers / 14 days) for a personal account.

## Screenshot note
Done. The set now leads with the schedule and includes both the sign-in gate and
the paywall, so the listing matches what a new user actually gets. The captures
are from a dev build, so the dev-only "simulated billing" / "dev mode" notices
were cropped out — reshoot from a production build if you want them frame-exact.

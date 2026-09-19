# أثر (Athr) — Mobile App

A React Native (Expo) app for tracking daily prayers, athkar, and other acts
of worship, with a from-scratch redesigned home screen and UI.

## Design language

Deliberately different from typical blue/white prayer-time apps: a warm
"manuscript" palette (parchment background, ink-brown primary, amber/gold
accent, sage-green success state) inspired by the أثر pen-and-ink logo, with
a Cairo Arabic typeface, full RTL layout, and card-based navigation. There's
no bottom tab bar — Home is the single landing screen and menu; everything
else (Tracker, Athkar, prayer times, tasbih, stats, settings) is one tap
away from it (`src/navigation/RootNavigator.js`).

The palette ships in a light and a dark variant built from the same
identity (`src/theme/palettes.js`), plus a "تلقائي" (system) option that
follows the OS setting — switchable anytime from Settings → "مظهر التطبيق"
and persisted on-device. Every screen reads colors through `useTheme()`
(`src/context/ThemeContext.js`) rather than importing a static palette, so
the whole app re-renders live when the preference changes. A handful of
surfaces (hero cards, solid buttons, active chips) intentionally use the
fixed `colors.accentDark` token instead and stay dark in both themes, the
same way a filled button doesn't invert with the page around it.

## Working offline

The app never blocks on connectivity:

- **Session**: the auth token/guest session persists locally regardless of
  network. If the server can't be reached at boot, the app runs on the last
  user it successfully confirmed (`src/utils/userCache.js`) instead of
  ever treating "offline" as "logged out" — see `AuthContext.bootstrapSession`.
- **Daily data**: every successful load of a day's prayers/athkar/Quran/
  tasks/stats is cached to disk (`src/hooks/useDailyData.js`); if a later
  load fails for network reasons, that cache is what renders, so a day
  already seen once keeps working with no connection at all.
- **Writes made offline aren't lost or reverted**: marking a prayer,
  athkar, task, or tasbih count while offline updates the UI immediately
  and queues the write (`src/utils/pendingActions.js`); the queue replays
  automatically, in order, the next time anything talks to the server
  successfully. Only a real server rejection (not just "no connection")
  ever reverts an optimistic update.
- **Location**: the last successfully-acquired GPS fix (plus its detected
  city/calculation method) is cached (`src/utils/locationCache.js`) and
  reused whenever a fresh fix isn't available — permission just revoked,
  no GPS signal, airplane mode — instead of ever falling back to a generic
  Makkah placeholder as long as the device has located itself at least once
  before. `usePrayerTimes().isStaleLocation` tells the UI when that's what
  it's showing.

## Features

- **No forced login.** The app opens straight into the Tracker/Home with a
  silent guest session tied to an on-device id (`src/utils/deviceId.js` +
  `POST /api/auth/device`) — nothing is ever asked for at launch or blocked
  behind a sign-in wall. Settings shows a one-tap "احفظ بياناتك" (save your
  data) prompt for guests, which attaches a real email/password to that
  *same* account (`UpgradeAccountScreen.js`) without losing anything already
  tracked. Real accounts still get email/password, **Sign in with Google**,
  and **Sign in with Apple** (`src/context/AuthContext.js`,
  `src/components/SocialAuthButtons.js`) for signing in from another device.
- **العدّاد (tasbih counter)**: reachable from Home's prayer-times menu and
  from "المزيد" — pick a common dhikr or add a custom one, tap to count
  (with a reset button), synced to the same guest/real account
  (`TasbihScreen.js`, `TasbihCounterScreen.js`, `/api/tasbih`).
- **Home**: a live ticking clock, greeting + Hijri/Gregorian date, a
  read-only next-prayer countdown (calculated on-device from GPS via
  `adhan`, no server round-trip needed — marking a prayer prayed only
  happens on the Tracker tab, never from Home), a "today's imprint"
  weighted score ring, and organized link sections instead of a flat icon grid
- **Prayer times detail**: the full day's schedule stacked vertically with a
  live per-second countdown to the next one, plus which city/coordinates and
  calculation method are being used and a one-tap way to refresh the location
- **Prayer notifications**: an at-adhan alert and/or a reminder a graduated
  number of minutes before each prayer (5/10/15/30/60), both toggled from
  Settings and scheduled on-device with `expo-notifications`
- **Tracker**: a 7-day ring strip (this week's daily completion at a glance)
  above a per-prayer grid — each of the 5 prayers gets its own column with
  its rawatib/witr/qiyam and the athkar naturally tied to that time of day
  (morning under Fajr, evening under Asr, sleep under Isha) stacked under
  it, plus Quran wird and fully custom "daily deeds" / "other" checklists.
  Every prayer/nawafil square stays locked until that prayer's time actually
  starts — no marking a prayer done before its time. An optional "يوم عذر
  شرعي" (legitimate excuse) toggle, shown once gender is set to female in
  Settings, marks a day's prayers as not obligatory instead of missed.
- **Athkar**: 5 categories (morning, evening, after-prayer, sleep, wake-up)
  with a tap-to-count reader for each dhikr and its repeat count
- Bonus sections: 99 Names of Allah, curated duas, a live Qibla compass
  (magnetometer + bearing calculation), and a 7-day stats chart
- Arabic-first, right-to-left throughout

## Getting started

```bash
cd mobile
npm install
```

Point the app at your API in `app.json` → `expo.extra.apiBaseUrl` (defaults
to `http://localhost:4000/api`; use your machine's LAN IP when testing on a
physical device, since `localhost` there means the device itself).

```bash
npm start        # then press i / a / w, or scan the QR code with Expo Go
```

Email/password sign-in works immediately with no extra setup. Google and
Apple sign-in need one-time provider setup first — see below; until then,
their buttons still render but will show an error when tapped.

## Social sign-in setup

### Google

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an OAuth consent screen (External, "Testing" mode is fine while developing).
2. Create three **OAuth client IDs** (Credentials → Create Credentials → OAuth client ID):
   - **Web application** — required even though the app is native, because
     Expo Go's sign-in flow authenticates as a web client. Add
     `https://auth.expo.io/@your-expo-username/athr` as an authorized redirect URI.
   - **iOS** — application bundle ID `app.athr.mobile` (used by standalone/EAS iOS builds).
   - **Android** — package name `app.athr.mobile`, plus your build's SHA-1
     fingerprint (used by standalone/EAS Android builds).
3. Paste all three into `src/config/oauth.js`.
4. Add every client ID to the backend's `GOOGLE_CLIENT_IDS` (comma-separated)
   in `backend/.env` — the server accepts an ID token audienced to any of them.

### Apple

1. In [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list),
   enable the **"Sign In with Apple"** capability on the `app.athr.mobile` App ID.
2. No client ID goes in the mobile app — `expo-apple-authentication` talks to
   Apple's native SDK directly using that bundle identifier, and only runs
   on a real iOS device or simulator with iOS 13+ (the button hides itself
   everywhere else, per Apple's guidelines).
3. Set `APPLE_CLIENT_ID=app.athr.mobile` in `backend/.env` — that's the
   audience Apple puts in the identity token for a native app.
4. It only ever runs on iOS (13+) — real device or simulator; the button
   hides itself on Android and web. Basic testing works in Expo Go, but the
   "Sign In with Apple" entitlement only really takes effect in a build that
   carries your App ID, so confirm with a custom dev client or EAS build
   (`eas build --profile development --platform ios`) before shipping.

## Project layout

```
mobile/
  App.js                      # font loading, RTL setup, provider tree
  src/
    theme/                    # palettes (light/dark), typography, spacing tokens
    api/client.js             # fetch wrapper + token storage
    context/AuthContext.js    # guest/login/register/upgrade/logout/session
    context/ThemeContext.js   # light/dark/system preference, persisted
    utils/deviceId.js         # on-device guest id (AsyncStorage, generated once)
    hooks/                    # usePrayerTimes (adhan), useDailyData (API)
    navigation/               # bottom tabs + stack
    screens/                  # one file per screen
    components/               # Card, ProgressRing, CheckRow, ...
    constants/                # athkar text, 99 names, duas (bundled offline)
```

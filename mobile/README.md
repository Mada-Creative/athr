# أثر (Athr) — Mobile App

A React Native (Expo) app for tracking daily prayers, athkar, and other acts
of worship, with a from-scratch redesigned home screen and UI.

## Design language

Deliberately different from typical blue/white prayer-time apps: a warm
"manuscript" palette (parchment background, ink-brown primary, amber/gold
accent, sage-green success state) inspired by the أثر pen-and-ink logo, with
a Cairo Arabic typeface, full RTL layout, and a bottom-tab + card-based
navigation instead of the reference app's top horizontal tab bar. See
`src/theme/colors.js`.

## Features

- Email/password auth against the أثر API, plus **Sign in with Google** and
  **Sign in with Apple** (`src/context/AuthContext.js`, `src/components/SocialAuthButtons.js`)
- **Home**: greeting + Hijri/Gregorian date, live next-prayer countdown with
  tap-to-mark prayer chips (calculated on-device from GPS via `adhan`, no
  server round-trip needed), a "today's imprint" weighted score ring, and a
  quick-access grid to every section
- **Tracker**: full daily checklist — 5 fard prayers, 7 rawatib/qiyam/witr,
  Quran wird, athkar categories, plus fully custom "daily deeds" / "other"
  checklists the user can add to
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
  App.js                    # font loading, RTL setup, provider tree
  src/
    theme/                  # colors, typography, spacing tokens
    api/client.js           # fetch wrapper + token storage
    context/AuthContext.js  # login/register/logout/session
    hooks/                  # usePrayerTimes (adhan), useDailyData (API)
    navigation/             # bottom tabs + stack
    screens/                # one file per screen
    components/             # Card, ProgressRing, CheckRow, ...
    constants/              # athkar text, 99 names, duas (bundled offline)
```

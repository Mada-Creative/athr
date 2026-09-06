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

- Email/password auth against the أثر API (`src/context/AuthContext.js`)
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

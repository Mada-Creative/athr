# أثر (Athr)

**اجعل لعبادتك أثرًا يوميًا** — a prayer & athkar tracking app: React Native
(Expo) client + Express/MongoDB API.

- [`backend/`](backend/README.md) — REST API (Node, Express, MongoDB)
- [`mobile/`](mobile/README.md) — React Native app (Expo)

## Quick start

```bash
# API
cd backend && npm install && cp .env.example .env && npm run dev

# App (in another terminal)
cd mobile && npm install && npm start
```

The mobile app talks to the API at `expo.extra.apiBaseUrl` in
`mobile/app.json` — update it to your machine's LAN IP when running on a
physical device.

## What this is

A redesign + rebuild of a prayer-times/athkar tracking app: same underlying
idea (prayer times, daily prayer checklist, rawatib/nawafil, athkar by time
of day, a customizable weighted daily "completion" score, weekly stats,
Qibla, Asma' Allah, duas) but with its own visual identity — a warm
ink-and-parchment palette built around the أثر logo, a bottom-tab + card
layout instead of the reference app's top tab bar, and a full Express/MongoDB
backend instead of local-only storage.

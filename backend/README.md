# أثر (Athr) — API

Express + MongoDB REST API powering the أثر prayer & athkar tracking app.

## Stack

- Node.js / Express
- MongoDB via Mongoose
- JWT authentication (`jsonwebtoken` + `bcryptjs`), plus Sign in with Google
  (`google-auth-library`) and Sign in with Apple (`apple-signin-auth`)

## Getting started

```bash
cd backend
npm install
cp .env.example .env   # then edit MONGO_URI / JWT_SECRET
npm run dev             # nodemon, http://localhost:4000
```

Optional demo account:

```bash
npm run seed
# -> demo@athr.app / athr1234
```

## Data model

| Collection      | Purpose                                                              |
| ---------------- | --------------------------------------------------------------------- |
| `users`          | Account, auth provider, calculation method, madhab, and the six score weights |
| `prayerlogs`     | One doc/day: 5 fard prayers + 7 rawatib/qiyam/witr ("nawafil")       |
| `athkarlogs`     | One doc per day/category tracking which dhikr items are done        |
| `quranlogs`      | Daily Quran wird checkbox + optional pages read                      |
| `customtasks`    | User-defined checklist items ("dailyDeeds" or "other")               |
| `customtasklogs` | Daily completion state for each custom task                          |

Static dhikr text lives in `src/data/athkarContent.js` and is also mirrored on
the mobile client so the wording works even fully offline; only completion
progress is synced through the API.

## Score calculation

`GET /api/stats/day/:date` and `GET /api/stats/week` compute a weighted
percentage from six buckets (prayers, nawafil, athkar, quran, dailyDeeds,
other). Each user can rebalance the weights (must total 100) via
`PUT /api/auth/settings`.

## Main endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google                 { idToken }               — verifies against GOOGLE_CLIENT_IDS
POST   /api/auth/apple                  { identityToken, name? }  — verifies against APPLE_CLIENT_ID
GET    /api/auth/me
PUT    /api/auth/settings

GET    /api/prayers/:date
PATCH  /api/prayers/:date/toggle        { group: 'fard'|'nawafil', key, value }
PATCH  /api/prayers/:date/excuse        { excused }                — legitimate-excuse day (see below)

GET    /api/athkar/content              (public, static text bundle)
GET    /api/athkar/:date
PATCH  /api/athkar/:date/:category      { itemIndex } | { completed }

GET    /api/quran/:date
PATCH  /api/quran/:date                 { completed, pagesRead }

GET    /api/tasks?group=dailyDeeds|other
POST   /api/tasks                       { group, title, description }
DELETE /api/tasks/:id
GET    /api/tasks/logs/:date
PATCH  /api/tasks/logs/:date/:taskId    { completed }

GET    /api/stats/day/:date
GET    /api/stats/week?endDate=YYYY-MM-DD
```

All routes except `register`, `login`, `google`, `apple` and `athkar/content`
require `Authorization: Bearer <token>`.

Google and Apple sign-in create an account automatically on first use (or
link to an existing account with the same email) — see `mobile/README.md`
→ "Social sign-in setup" for the client IDs / capability config each one
needs, and set `GOOGLE_CLIENT_IDS` / `APPLE_CLIENT_ID` in `.env` before
testing them.

### Legitimate-excuse days (عذر شرعي)

`PrayerLog.excused` marks a day where prayer wasn't obligatory
(menstruation/postpartum). While set: `toggle` on that date's fard/nawafil
is rejected, and `computeDayScore` counts the prayers and nawafil buckets
as fully met for that day rather than missed — it isn't a fast someone
makes up later, so it shouldn't read as a broken streak either. The mobile
app only shows the toggle once `User.gender` is set to `'female'`
(`PUT /api/auth/settings { gender: 'female' }`); the API itself doesn't
gate the endpoint by gender.

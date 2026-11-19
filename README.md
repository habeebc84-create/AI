# FocusEd AI

An AI-powered homework portal for schools — assignments, submissions and
grading, a focus timer, study goals and weekly plans, an AI tutor, and
parent visibility, all scoped per institution with Row Level Security.

## Status (honest)

| Area | State |
|---|---|
| Frontend (React + Vite) | Built in parallel by another agent in `src/` |
| Database schema (28 tables, RLS) | ✅ Written — `supabase/migrations/0001_init.sql` |
| Demo seed data | ✅ Written — `supabase/seed.sql` |
| Edge Functions (5) | ✅ Written — `supabase/functions/*` |
| Docs | ✅ Written — `docs/` |
| RLS negative tests | ✅ Written, **not yet run** — `tests/security/rls-negative-tests.sql` |
| Live Supabase project | ❌ **Not connected — by design.** Storage is local-only (see below); the Supabase files are kept as an optional future, nothing is deployed or tested against a hosted DB |
| Runnable today | ✅ **Local-only storage** (localStorage on this computer, no backend needed) |

## Quick start (local-only storage — no setup)

```bash
npm install
npm run dev
```

Open http://localhost:5173 and pick a demo account from the login page
(click an account to fill the form). All data lives in localStorage;
nothing leaves the browser.

## Demo accounts

| Role | Name | Email | Password |
|---|---|---|---|
| Student | Aarav Sharma | aarav@demo.focused.ai | `demo1234` |
| Teacher | Ms. Priya Nair | priya@demo.focused.ai | `demo1234` |
| Parent | Rohit Sharma | rohit@demo.focused.ai | `demo1234` |
| Admin | Sunrise Admin | admin@demo.focused.ai | `demo1234` |

Demo data includes 6 assignments (Maths, Science, English, History, Computer Science),
3 submissions (one graded 17/20 with feedback), focus sessions, a study
goal and weekly plan, an AI conversation, and notifications. These are
sample credentials for Demo Mode only — never use them in production.

## Commands

```bash
npm install     # install dependencies
npm run dev     # start the Vite dev server (http://localhost:5173)
npm run build   # production build (must pass before deploying)
npm test        # frontend test suite (Vitest)
```

## Storage: local-only by design

All data lives on this computer, in the browser's localStorage — accounts, assignments, submissions (including uploaded file contents up to 2 MB per file, 4 MB total), focus sessions, and messages. Nothing is sent to a server. The Supabase schema, seed, and Edge Functions in `supabase/` are kept as an optional future and are not wired in.

| | Local-only (current) | Supabase (optional future) |
|---|---|---|
| Data | localStorage on this computer | Supabase Postgres (28 tables) |
| Auth | sample account picker | Supabase Auth (email/password) |
| AI tutor | scripted guided hints | `ai-tutor` Edge Function + OpenAI / Gemini / Anthropic |
| Notifications | local | `notification-worker` Edge Function (cron) |
| Requires | nothing | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (see `.env.example`) |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full picture.
In short: React frontend → Supabase (Postgres + Auth + Edge Functions) →
AI providers (server-side keys only). RLS enforces that students see only
their own records + their classes' assignments, teachers see only their
classes/submissions, parents see only linked children, and admins are
institution-scoped.

- [`docs/DATABASE.md`](docs/DATABASE.md) — all 28 tables, indexes, RLS model, seed data
- [`docs/SETUP.md`](docs/SETUP.md) — local + hosted setup
- [`docs/AI_SETUP.md`](docs/AI_SETUP.md) — AI provider keys, guards, costs
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel + Supabase deploy, cron, rollback
- [`docs/TESTING.md`](docs/TESTING.md) — frontend tests, RLS tests, function smoke tests
- [`docs/SECURITY.md`](docs/SECURITY.md) — threat model, secrets, known gaps

## Backend layout

```
supabase/
├── config.toml
├── seed.sql
├── migrations/0001_init.sql
└── functions/
    ├── ai-tutor/index.ts              # provider-agnostic AI chat
    ├── ai-admin-config/index.ts       # admin provider config + settings
    ├── assignment-actions/index.ts    # publish / grade / submit
    ├── guardian-invitations/index.ts  # parent invite / accept
    └── notification-worker/index.ts   # cron: due + graded reminders
tests/security/rls-negative-tests.sql
```

## Deployment (summary)

1. `npm run build`
2. Deploy the frontend to Vercel with `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` set.
3. `supabase link`, `supabase db push`, deploy the five functions,
   set server secrets (`SUPABASE_SERVICE_ROLE_KEY`, provider keys,
   `CRON_SECRET`).
4. Schedule `notification-worker` hourly with the cron secret.
5. Run the RLS negative tests and the post-deploy checks in
   [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Security notes

- No real API keys or credentials are in this repo (`.env.example` is
  empty placeholders only).
- AI keys live only in Supabase secrets; the admin API rejects any
  key-like field; provider fetches are limited to an HTTPS host allowlist.
- See [`docs/SECURITY.md`](docs/SECURITY.md) for the full picture and
  known gaps (RLS tests unrun, storage not configured, no email delivery yet).

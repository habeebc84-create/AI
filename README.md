# FocusEd AI

FocusEd AI is a college capstone demo for assignments, grading, focused study,
reference-book tutoring, and linked-parent progress. The demo runs on Vercel
and stores its accounts and records in one browser profile.

[Open the demo](https://focused-ai.vercel.app/login)

## Submission and capacity

Run the tests and build with Node.js 24 and the locked Bun dependencies.
The capacity regression creates a class of 100 student accounts, publishes
three assignments, accepts 100 text submissions, and checks that coursework
and alerts persist after reload. This verifies the browser-local demo workflow.

The shared laptop mode stores records in SQLite on the host and signs students,
teachers and parents in independently from their devices. The server test
covers 100 independent student sessions, concurrent submissions and a restart.
See [Run FocusEd AI on a laptop](docs/LAPTOP_SERVER.md) for setup.

## Quick start (local-only storage — no setup)

```bash
npx bun@1.4.5 install --frozen-lockfile
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
npx bun@1.4.5 install --frozen-lockfile     # install dependencies
npm run dev     # start the Vite dev server (http://localhost:5173)
npm run build   # production build (must pass before deploying)
npm test        # frontend test suite (Vitest)
```

## Storage: local-only by design

All data lives on this computer, in the browser's localStorage — accounts, assignments, submissions (including uploaded file contents up to 2 MB per file, 3 MB total), focus sessions, and messages. Nothing is sent to a server. The Supabase schema, seed, and Edge Functions in `supabase/` are kept as an optional future and are not wired in.

| | Local-only (current) | Supabase (optional future) |
|---|---|---|
| Data | localStorage on this computer | Supabase Postgres (28 tables) |
| Auth | sample account picker | Supabase Auth (email/password) |
| AI tutor | scripted guided hints | `ai-tutor` Edge Function + OpenAI / Gemini / Anthropic |
| Notifications | local | `notification-worker` Edge Function (cron) |
| Requires | a browser | a hosted project and frontend integration |

## Architecture

The deployed demo is a React/Vite application with browser-local persistence.
The proposed shared architecture uses Supabase Auth, Postgres row-level
security, Storage and Edge Functions. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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

Run `npm test` and `npm run build`, then deploy the generated `dist/`
directory to Vercel. The browser demo requires no backend environment values.
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the GitHub Pages workflow
and the proposed backend setup.

## Security notes

- No real API keys or credentials are in this repo (`.env.example` is
  empty placeholders only).
- AI keys live only in Supabase secrets; the admin API rejects any
  key-like field; provider fetches are limited to an HTTPS host allowlist.
- See [`docs/SECURITY.md`](docs/SECURITY.md) for the full picture and
  known gaps (RLS tests unrun, storage not configured, no email delivery yet).

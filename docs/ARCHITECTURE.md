# FocusEd AI — Architecture

## What this is

FocusEd AI is an AI-powered homework portal for schools: students get
assignments, submit work, track focus sessions, set study goals, and chat
with an AI tutor; teachers create and grade assignments; parents follow
linked children; institution admins configure the AI provider.

## Status (honest)

- **Implemented:** the full database schema (`supabase/migrations/0001_init.sql`),
  demo seed data (`supabase/seed.sql`), five Deno Edge Functions
  (`supabase/functions/*`), docs, and RLS negative tests.
- **Not connected:** no live Supabase project exists yet. Nothing here has
  been deployed or run against a hosted database.
- **Runnable today:** the frontend runs in **Demo Mode** (localStorage) with
  the four demo accounts. Real (Supabase-backed) mode works only after the
  steps in `SETUP.md` are done and env vars are set.

## System overview

```
┌──────────────────────┐        ┌──────────────────────────────┐
│  Frontend (React +   │        │  Supabase (not connected)    │
│  Vite, in src/)      │        │                              │
│                      │        │  • Postgres (28 tables, RLS) │
│  Demo Mode:          │        │  • Auth (JWT)                │
│  localStorage, no    │  REST/ │  • Storage (attachments)     │
│  network             │───────▶│  • Edge Functions (Deno)     │
│                      │        │     ai-tutor                 │
│  Real Mode:          │        │     ai-admin-config          │
│  @supabase/supabase- │        │     assignment-actions       │
│  js client           │        │     guardian-invitations     │
│                      │        │     notification-worker      │
└──────────────────────┘        └──────────────────────────────┘
                                          │
                                          ▼
                                 AI providers (server-side only)
                                 OpenAI-compatible / Gemini / Anthropic
                                 Keys live in env vars, never in the client.
```

## Frontend modes

| | Demo Mode | Real Mode |
|---|---|---|
| Data source | localStorage seed | Supabase Postgres |
| Auth | demo account picker, no password | Supabase Auth (email/password) |
| AI tutor | scripted demo replies | `ai-tutor` Edge Function + real provider |
| Requires | nothing | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |

The mode switch is: if the Supabase env vars are set, the app uses the
real client; otherwise it falls back to Demo Mode. Demo accounts are
listed in `README.md`.

## Backend components

### Database (28 tables)
See `DATABASE.md`. Core domains: identity & institutions, classes &
enrolments, guardian links & invitations, subjects & assignments,
submissions & feedback, focus timer, study goals & plans, AI tutor
(conversations, messages, usage, provider configs), notifications, audit.

### Edge Functions (Deno, `supabase/functions/`)
| Function | Purpose | Auth |
|---|---|---|
| `ai-tutor` | Provider-agnostic AI chat; resolves the institution's active provider, enforces daily limits, persists messages + usage | user JWT |
| `ai-admin-config` | Admin CRUD for provider configs + institution settings; rejects any key/secret field | user JWT + admin role |
| `assignment-actions` | publish / grade / submit with notifications + audit log | user JWT + role checks |
| `guardian-invitations` | invite / accept guardian links via `role_invitations` tokens | user JWT |
| `notification-worker` | Cron: due-soon + graded notifications, honouring preferences | CRON_SECRET / service-role key |

All five are structured, validated, and ready to deploy; none has been
deployed or tested against a live project yet.

### Auth & authorization
- Supabase Auth (JWT) identifies the caller in every function.
- Row Level Security enforces visibility in Postgres: students see only
  their own records + assignments for their classes; teachers see only
  their classes/submissions; parents see only linked children via
  `guardian_links`; admins are institution-scoped via
  `institution_memberships`.
- The service-role key bypasses RLS and is used only server-side inside
  Edge Functions. It must never be shipped to the browser.

## Data flow: AI tutor
1. Student sends a message from the frontend.
2. `ai-tutor` verifies the JWT, validates input, checks the daily limit
   (`ai_usage_records` + institution settings).
3. It loads the institution's active `ai_provider_configs` row (provider,
   model, max tokens, temperature, system prompt — no secrets).
4. It calls the provider adapter (OpenAI-compatible / Gemini / Anthropic)
   with the key from server-side env vars only, behind an HTTPS host
   allowlist (SSRF guard) and a 30s timeout.
5. Messages and a usage record are persisted; the reply is returned.

## Data flow: assignment publish
1. Teacher calls `assignment-actions/publish`.
2. Function checks the caller is the assignment's teacher or an
   institution admin, and that the assignment is a draft.
3. Status flips to `published`; every enrolled (or targeted) student gets
   a `notifications` row; an `audit_logs` row is written.

## File layout

```
focused-ai/
├── README.md
├── .env.example
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   ├── migrations/0001_init.sql
│   └── functions/
│       ├── ai-tutor/index.ts
│       ├── ai-admin-config/index.ts
│       ├── assignment-actions/index.ts
│       ├── guardian-invitations/index.ts
│       └── notification-worker/index.ts
├── docs/            (this file + DATABASE, SETUP, AI_SETUP, DEPLOYMENT, TESTING, SECURITY)
└── tests/security/rls-negative-tests.sql
```

## What is deliberately NOT built yet
- Email/push delivery of notifications (rows are created; no provider wired).
- Guardian invitation emails (token is returned to the caller instead).
- File uploads to Supabase Storage (attachment tables exist; bucket +
  storage policies are not configured yet).
- Realtime subscriptions.
- Any CI/CD pipeline.

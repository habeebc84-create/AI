# FocusEd AI — Setup

## Prerequisites
- Node.js 18+ and npm
- Supabase CLI (`npm i -g supabase`) and Docker (for local Supabase only)
- A Supabase account (for the hosted path only)

## 1. Run the frontend in Demo Mode (no Supabase needed)

This is the runnable path today — no live Supabase project is connected yet.

```bash
cd focused-ai
npm install
npm run dev
```

Open http://localhost:5173 and pick a demo account:
student (Aarav Sharma), teacher (Ms. Priya Nair), parent, or admin.
All data lives in localStorage; nothing leaves the browser.

## 2. Local Supabase (real mode, on your machine)

```bash
supabase start          # requires Docker; first run downloads images
supabase db push        # applies supabase/migrations/0001_init.sql
```

Create the four demo Auth users (Dashboard → Authentication → Add user,
or `supabase auth` flows), then load the seed. **The seed's profile UUIDs
only work if the Auth users have those exact IDs** — in practice, create
the users first, note their real IDs, and either update the seed UUIDs or
create the profile rows through the app's onboarding flow. See
`DATABASE.md` for the caveat.

```bash
psql "postgresql://postgres:postgres@localhost:54322/postgres" \
  -f supabase/seed.sql
```

Copy `.env.example` to `.env` and fill in the local values printed by
`supabase start` (URL `http://localhost:54321`, anon key from the output):

```bash
cp .env.example .env
npm run dev
```

## 3. Hosted Supabase project

1. Create a project at https://supabase.com/dashboard.
2. In the SQL editor, run `supabase/migrations/0001_init.sql`, then the
   seed (after creating the Auth users — see the caveat in step 2).
3. Deploy the Edge Functions (see `DEPLOYMENT.md`).
4. Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and the server-side
   `SUPABASE_SERVICE_ROLE_KEY` (as a Supabase secret, never in the
   frontend `.env` that ships to the browser — see `SECURITY.md`).
5. `npm run dev` — the app now uses the real client instead of Demo Mode.

## 4. Verify

- `npm test` — runs the frontend test suite (see `TESTING.md`).
- In the SQL editor, run `tests/security/rls-negative-tests.sql` while
  signed in as each demo role; every `NEG-*` check must return 0 rows
  and every `POS-*` check must return rows.
- Sign in as the demo teacher and publish a draft assignment; the
  student should see a notification.

## Troubleshooting
- **"Invalid API key" in the browser:** `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are missing or wrong — the app falls back to
  Demo Mode; check `.env` and restart `npm run dev`.
- **Seed fails on `profiles` FK:** the Auth users don't exist yet (see
  step 2 caveat).
- **`supabase start` fails:** Docker is not running.
- **AI tutor returns 503 `provider_not_configured`:** no provider key is
  set in server env vars — see `AI_SETUP.md`.

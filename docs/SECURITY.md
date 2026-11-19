# FocusEd AI — Security

## Threat model (school homework portal)
Users are students (minors), teachers, parents, and institution admins.
Sensitive data: children's names, grades, submissions, focus habits, AI
chat history, parent contact details. The system must never let one
family see another's data, never leak API keys, and never let a student
escalate to teacher/admin powers.

## Implemented

### Row Level Security (all 28 tables)
RLS is enabled on every user table in `supabase/migrations/0001_init.sql`.
Policies enforce: students see only their own records + assignments for
their classes; teachers see only their classes/submissions; parents see
only linked children (`guardian_links.status = 'accepted'`); admins are
institution-scoped. Negative tests proving the denials:
`tests/security/rls-negative-tests.sql` (written, not yet run — no live
project exists yet).

### Auth
- Every Edge Function checks the `Authorization: Bearer <JWT>` header
  with `supabase.auth.getUser()` before doing anything.
- `notification-worker` is the exception: it requires the shared
  `CRON_SECRET` header or the service-role key, never a user JWT.
- Role checks inside functions are defence-in-depth on top of RLS
  (e.g. only the assignment's teacher or an institution admin can
  publish/grade).

### Secrets
- **No real API keys or credentials exist anywhere in this repo.**
  `.env.example` contains empty placeholders only. `seed.sql` contains
  demo UUIDs and demo emails, no passwords — demo sign-in runs in
  localStorage Demo Mode.
- AI provider keys live only in Supabase secrets / server env vars and
  are read via `Deno.env` inside `ai-tutor`. They are never sent to the
  client, never stored in `ai_provider_configs`, and never echoed in
  error responses.
- `ai-admin-config` rejects any request containing a key-like field
  (`api_key`, `secret`, `token`, `password`) with HTTP 400.
- The service-role key bypasses RLS by design and is used only inside
  Edge Functions. It must never be shipped to the browser or committed.

### AI provider calls (SSRF guard)
`ai-tutor` validates every provider URL before fetching: HTTPS only, and
the host must be in the allowlist — `api.openai.com`,
`generativelanguage.googleapis.com`, `api.anthropic.com`. A custom
`OPENAI_BASE_URL` pointing elsewhere is rejected. Fetch timeout is 30s.

### Input validation
All five functions validate inputs manually (Zod-style, no dependency):
required fields, types, UUID format, email format, string length caps,
numeric ranges (marks ≤ total marks, max tokens 1–8192, temperature
0–2). Invalid input returns 400 with a `code` + `message`, never a stack
trace.

### Rate limiting
`ai-tutor` enforces a per-user daily cap (50) and the institution's
`ai_daily_message_limit` (default 50) from `ai_usage_records`, returning
429 when exceeded. This is abuse mitigation, not billing-grade metering.

### Audit
`audit_logs` records assignment publishes, grades, guardian invites, and
AI config changes (actor, institution, entity, metadata). Readable only
by institution admins.

### Invitations
Guardian invitations use a 32-byte random hex token, expire after 7 days,
and can only be accepted by a signed-in user whose email matches the
invitation. Accepting flips the pending `guardian_links` row to accepted.

## Not yet done / known gaps
- **RLS tests have not been executed** against a live database (no
  project connected). Run `tests/security/rls-negative-tests.sql` before
  any production use.
- **Storage bucket + storage policies are not configured.** Do not enable
  file uploads until a private bucket with mirroring RLS policies exists
  (see `DEPLOYMENT.md` §5).
- **Email/push delivery is not wired.** Notifications are in-app rows
  only; no email provider is configured, so no verification email or
  password-reset flow is live yet.
- **No CSP / security headers** are set on the frontend hosting yet —
  add them at the Vercel/host level at deploy time.
- **No automated dependency scanning** (Dependabot / `npm audit` in CI)
  is set up yet.
- **Rate limiting is per-day counts in Postgres**, not a distributed
  limiter; a determined caller could still burn provider quota up to the
  daily cap.
- Demo Mode stores demo data in localStorage on the user's own device;
  it is not a multi-user store and must not be used for real student data.

## Reporting a vulnerability
Do not open a public issue with exploit details. Contact the project
maintainer privately with: what you found, which role you were signed in
as, and steps to reproduce.

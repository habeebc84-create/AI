# FocusEd AI — Testing

## What exists

| Suite | Location | Status |
|---|---|---|
| Frontend unit tests | `npm test` (Vitest, frontend-owned) | Run by the frontend agent; not verified here |
| RLS negative tests | `tests/security/rls-negative-tests.sql` | Written, **not yet run** — no live Supabase project is connected |
| Edge Function checks | manual, below | Not yet run against a deployed function |
| Seed-data checks | SQL, below | Not yet run |

Nothing in this repo has a green test run to point at yet. This doc says
what to run once a Supabase project exists.

## 1. Frontend tests

```bash
npm test            # Vitest, watch mode off in CI
npm run build       # must pass; catches type errors
```

## 2. RLS negative tests (the important ones)

File: `tests/security/rls-negative-tests.sql`.

How to run: in the Supabase SQL editor, sign in as a user (or use
`set local role authenticated` with that user's JWT claims so
`auth.uid()` resolves), then run the file section by section.

- Every `NEG-*` query must return **0 rows** (and `UPDATE 0` /
  `DELETE 0` for NEG-10/11). Any row is a security failure — fix the
  policy in `supabase/migrations/0001_init.sql` before shipping.
- Every `POS-*` control must return rows (3 submissions for Aarav,
  5 published assignments, etc.). A 0 here means a policy is too
  strict, not just secure.

Sections: as Aarav (student) NEG-01–12 + POS-01–03; as Rohit (parent)
NEG-P1 + POS-P1; as Priya (teacher) NEG-T1/2 + POS-T1.

To run the cross-student checks (NEG-01–06, 12), first create the second
student `55555555-5555-5555-5555-555555555555` with the SETUP block at the
top of the file (service role).

## 3. Seed-data checks (after `seed.sql`)

```sql
select count(*) from public.assignments where status = 'published';  -- expect 5
select count(*) from public.submissions;                             -- expect 3
select count(*) from public.submissions where status = 'graded';    -- expect 1
select count(*) from public.focus_sessions;                          -- expect 3
select count(*) from public.notifications;                           -- expect 4
```

## 4. Edge Function smoke tests (after `supabase functions deploy`)

```bash
# ai-tutor — expect 200 with a reply, or 503 provider_not_configured if no key is set
curl -X POST https://<ref>.supabase.co/functions/v1/ai-tutor \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I solve x^2 - 5x + 6 = 0?"}'

# ai-tutor validation — expect 400 validation_error
curl -X POST https://<ref>.supabase.co/functions/v1/ai-tutor \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'

# ai-tutor unauthenticated — expect 401
curl -X POST https://<ref>.supabase.co/functions/v1/ai-tutor \
  -H "Content-Type: application/json" \
  -d '{"message": "hi"}'

# assignment-actions publish — expect 200, then the assignment is published
curl -X POST https://<ref>.supabase.co/functions/v1/assignment-actions/publish \
  -H "Authorization: Bearer <TEACHER_JWT>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": "<draft-assignment-uuid>"}'

# notification-worker dry run — expect 200 with counts, 0 rows created
curl -X POST https://<ref>.supabase.co/functions/v1/notification-worker \
  -H "x-cron-secret: <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

## 5. Manual QA checklist (Demo Mode, runnable today)
- Sign in as each demo account; dashboards show the right role's data.
- Student: submit a draft, start/complete a focus session, set a goal.
- Teacher: create + publish an assignment, grade a submission, see feedback.
- Parent: see Aarav's submissions and grades, nothing else's.
- Admin: change the AI provider config; confirm no key field is accepted.
- Reduced motion / keyboard navigation / 390px viewport spot-checks
  (frontend-owned; see the frontend's own checks).

## What is NOT tested yet
- No automated test has executed against a live database or a deployed
  function. The RLS file and the curl commands above are the test plan,
  not test results.
- No load, latency, or provider-failure testing has been done.

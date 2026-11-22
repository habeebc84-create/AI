# FocusEd AI — Deployment

**Status: not deployed.** No live Supabase project, hosting, or domain is
connected yet. The steps below are the deployment path, not a record of a
deployment that happened.

## Frontend on GitHub Pages

In the repository's **Settings → Pages**, select **GitHub Actions** as the
source. The **GitHub Pages** workflow tests and builds pull requests and
publishes the demo after changes land on `main`. You can also run the
workflow manually from the Actions tab.

The project site uses paths such as
`https://habeebc84-create.github.io/AI/#/login` so direct visits and refreshes
work on the static host. It runs with browser-local demo data.

## 1. Frontend (Vercel)

```bash
npm run build        # must pass before deploying
```

- Create a Vercel project from this repo (or `vercel` CLI).
- Set env vars in the Vercel dashboard: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`. (No service-role key, no AI keys — those are
  server-side only.)
- Every push to `main` auto-deploys. Preview deployments are created for
  pull requests.

## 2. Supabase (hosted)

```bash
supabase link --project-ref <your-project-ref>
supabase db push                          # applies migrations
supabase functions deploy ai-tutor
supabase functions deploy ai-admin-config
supabase functions deploy assignment-actions
supabase functions deploy guardian-invitations
supabase functions deploy notification-worker
```

Set server-side secrets (never in the frontend):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...   # from project settings
supabase secrets set OPENAI_API_KEY=...              # only the providers you use
supabase secrets set GEMINI_API_KEY=...
supabase secrets set ANTHROPIC_API_KEY=...
supabase secrets set CRON_SECRET=<random-string>     # for notification-worker
```

## 3. Cron — notification-worker

The worker is not on a timer by default. Options:

- **Supabase scheduled functions** (dashboard → Edge Functions → your
  function → Cron): schedule `notification-worker` hourly, sending the
  `x-cron-secret` header with the `CRON_SECRET` value.
- **External cron** (e.g. GitHub Actions, cron-job.org): `POST
  https://<project-ref>.supabase.co/functions/v1/notification-worker`
  with header `x-cron-secret: <CRON_SECRET>`.

The function returns a JSON summary (`dueRemindersCreated`,
`gradedNotificationsCreated`, `skippedByPreference`, `dryRun`).
Test first with `{ "dryRun": true }` — it reports what it would create
without inserting rows.

## 4. Auth configuration (Supabase dashboard)

- Site URL: your deployed frontend URL (e.g. `https://focused-ai.vercel.app`).
- Additional redirect URLs: same origin + `/**`.
- Enable email sign-ups; confirmations off for the demo, on for production.
- Create the demo/real users, then run `supabase/seed.sql` (see the Auth
  user caveat in `DATABASE.md`).

## 5. Storage (attachments) — not yet configured

`assignment_attachments` and `submission_attachments` store file paths,
but no Storage bucket or storage RLS policies exist yet. Before enabling
uploads: create a private bucket, add storage policies mirroring the
table RLS (student's own submission files, teacher's assignment files),
and set a file-size limit (see `supabase/config.toml`, currently 10 MiB).

## 6. Post-deploy checks

1. `npm run build` passes.
2. Sign in as each demo role; confirm the right data is visible.
3. Run `tests/security/rls-negative-tests.sql` — all `NEG-*` 0 rows.
4. Teacher publishes an assignment → students get a notification.
5. Student sends one AI tutor message → reply returns, row appears in
   `ai_usage_records`.
6. Trigger `notification-worker` with `dryRun: true` → sane counts.
7. Confirm no secret appears in any client bundle or log.

## Rollback
- Frontend: redeploy the previous Vercel deployment.
- Functions: `supabase functions deploy <name>` redeploys from the repo;
  keep the previous `index.ts` in git to roll back.
- Migrations: Supabase has no automatic down-migration; schema changes
  after first deploy must be additive migrations (`0002_...`).

# FocusEd AI — Database

Source of truth: `supabase/migrations/0001_init.sql`.
Demo data: `supabase/seed.sql`. **No live Supabase project is connected
yet — this schema has not been applied to any hosted database.**

## Tables (28)

| Table | Purpose | Key relations |
|---|---|---|
| `profiles` | One row per user; `role` = student/teacher/parent/admin | PK = `auth.users.id` |
| `institutions` | Schools / colleges | — |
| `institution_memberships` | Who belongs to which institution, in which role | → institutions, profiles |
| `institution_settings` | Per-institution toggles (AI on/off, daily limit, focus default) | → institutions (1:1) |
| `classes` | e.g. 10-A | → institutions, teacher (profiles) |
| `class_enrollments` | Students in classes | → classes, profiles |
| `guardian_links` | Parent ↔ student links (`pending`/`accepted`/`revoked`) | → profiles ×2 |
| `role_invitations` | Email invitations with a token, 7-day expiry | → institutions, classes, profiles |
| `subjects` | Maths, Science, … per institution | → institutions |
| `assignments` | Teacher-created work (`draft`/`published`/`closed`) | → institutions, subjects, classes, teacher |
| `assignment_targets` | Explicit per-student targeting beyond the whole class | → assignments, profiles |
| `assignment_attachments` | Files attached to an assignment (Storage path) | → assignments |
| `submissions` | One per (assignment, student); `draft`/`submitted`/`graded`/`returned`/`late` | → assignments, profiles |
| `submission_attachments` | Files attached to a submission | → submissions |
| `submission_feedback` | Teacher comments on a submission | → submissions, teacher |
| `focus_sessions` | A timed focus block | → profiles, subjects, assignments |
| `focus_events` | start/pause/resume/complete/abandon/distraction within a session | → focus_sessions |
| `focus_preferences` | Per-student timer defaults (1:1) | → profiles |
| `study_goals` | Student goals with target date / minutes per day | → profiles, subjects |
| `study_plans` | Weekly plans (AI-, teacher- or student-generated) | → profiles |
| `study_plan_items` | Day-by-day items in a plan | → study_plans, subjects, assignments |
| `ai_conversations` | Tutor chat threads | → profiles, subjects |
| `ai_messages` | Messages in a thread (`user`/`assistant`/`system`) | → ai_conversations |
| `ai_usage_records` | Per-call usage (provider, model, tokens, latency, success) | → profiles, institutions |
| `ai_provider_configs` | Provider choice + model/settings per institution — **no secrets** | → institutions |
| `notifications` | In-app notifications | → profiles, institutions, assignments, submissions |
| `notification_preferences` | Per-user toggles (1:1) | → profiles |
| `audit_logs` | Who did what (publish, grade, invite, config change) | → institutions, actor |

## Conventions
- UUID primary keys via `gen_random_uuid()` everywhere.
- `created_at` / `updated_at` (`timestamptz`, `now()` defaults) on all 28
  tables; `updated_at` is maintained by the `set_updated_at()` trigger,
  installed on every table by the migration.
- Check constraints on every status/role/type enum column and on
  non-negative numbers (marks, tokens, minutes, file sizes).
- Unique constraints: one submission per (assignment, student); one
  enrolment per (class, student); one guardian link per (guardian,
  student); one provider config per (institution, provider); one
  membership per (institution, user, role); one class per
  (institution, name, academic year).

## Indexes
Indexed: membership lookups (by user and by institution), classes (by
institution/teacher), enrolments (by class/student), guardian links (both
directions), invitations (email, token), assignments (class, teacher,
status+due_at), submissions (assignment, student, status), focus sessions
(student + started_at), AI messages (conversation), AI usage (user +
created_at), notifications (user + created_at, unread), audit logs
(institution + created_at, actor).

## Row Level Security
RLS is **enabled on all 28 tables**. The visibility model:

- **Students** — their own rows in `submissions`, `focus_sessions`,
  `focus_events`, `focus_preferences`, `study_goals`, `study_plans`,
  `ai_conversations`, `ai_messages`, `notifications`, plus `published`
  assignments for classes they are enrolled in (or explicitly targeted
  via `assignment_targets`).
- **Teachers** — their classes, their assignments, and submissions to
  those assignments; they can grade and give feedback on their own
  assignments only.
- **Parents** — only rows belonging to children linked through
  `guardian_links` with `status = 'accepted'` (submissions, focus data,
  goals, plans, published assignments).
- **Admins** — only rows inside institutions where they hold an
  `institution_memberships` row with `role = 'admin'`; they alone can
  read/write `ai_provider_configs` and `audit_logs`.

Helper functions (all `security definer`, `stable`): `current_role()`,
`my_institution_ids()`, `is_admin_of(uuid)`, `teaches_class(uuid)`,
`enrolled_in_class(uuid)`, `is_guardian_of(uuid)`.

Negative tests that prove the denials: `tests/security/rls-negative-tests.sql`.

## Seed data (`supabase/seed.sql`)
Demo-only, clearly labelled in the file. One institution (Sunrise Public
School), class 10-A, and the four demo accounts:

| Demo account | UUID | Role |
|---|---|---|
| Aarav Sharma (student) | `11111111-1111-1111-1111-111111111111` | student, Class 10-A |
| Ms. Priya Nair (teacher) | `22222222-2222-2222-2222-222222222222` | teacher of 10-A |
| Rohit Sharma (parent) | `33333333-3333-3333-3333-333333333333` | parent, linked to Aarav |
| Sunrise Admin | `44444444-4444-4444-4444-444444444444` | admin |

Plus: 4 subjects (Maths, Science, English, History), 6 assignments
(5 published, 1 draft), 3 submissions by Aarav (1 graded 17/20 with
feedback, 1 submitted, 1 draft), 3 focus sessions, a study goal and
weekly plan, an AI conversation, notifications, and an active OpenAI
provider config (settings only — no key).

**Caveat:** `profiles.id` references `auth.users(id)`, so the seed's
profile inserts only succeed after the corresponding Auth users exist.
In a real project, create users through Supabase Auth first (or let the
onboarding flow create profile rows) and use the real Auth user IDs.
No demo passwords are stored anywhere in this repo.

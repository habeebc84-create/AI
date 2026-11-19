-- FocusEd AI — initial schema
-- supabase/migrations/0001_init.sql
-- PostgreSQL / Supabase. Run with `supabase db push` or via the SQL editor.
-- No live Supabase project is connected yet; this file is the source of truth
-- for the schema and is NOT yet applied to any hosted database.
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid()).
--   * created_at / updated_at on every table; updated_at maintained by the
--     trigger `set_updated_at()` defined below.
--   * RLS ENABLED on every user-facing table. Policies are written for the
--     `authenticated` role and use auth.uid() plus the helper functions
--     below. Service-role (edge functions) bypasses RLS by design.
--   * Roles: 'student' | 'teacher' | 'parent' | 'admin' stored on profiles.role.
--     An admin is always scoped to one institution via institution_memberships.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role of the calling user (null when not authenticated).
create or replace function public.current_role()
returns text
language sql
stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Institutions the calling user belongs to (any role).
create or replace function public.my_institution_ids()
returns setof uuid
language sql
stable
security definer
as $$
  select institution_id
  from public.institution_memberships
  where user_id = auth.uid();
$$;

-- True when the calling user is an admin of the given institution.
create or replace function public.is_admin_of(uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.institution_memberships
    where user_id = auth.uid()
      and institution_id = $1
      and role = 'admin'
  );
$$;

-- True when the calling user teaches the given class.
create or replace function public.teaches_class(uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.classes
    where id = $1 and teacher_id = auth.uid()
  );
$$;

-- True when the calling user is enrolled in the given class.
create or replace function public.enrolled_in_class(uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.class_enrollments
    where class_id = $1 and student_id = auth.uid() and status = 'active'
  );
$$;

-- True when the calling user is a guardian of the given student.
create or replace function public.is_guardian_of(uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.guardian_links
    where guardian_id = auth.uid()
      and student_id = $1
      and status = 'accepted'
  );
$$;

-- ---------------------------------------------------------------------------
-- Core: institutions, profiles, memberships
-- ---------------------------------------------------------------------------

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type text not null default 'school'
    check (type in ('school', 'college', 'coaching', 'other')),
  city text,
  state text,
  country text default 'India',
  timezone text default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  display_name text,
  avatar_url text,
  role text not null check (role in ('student', 'teacher', 'parent', 'admin')),
  phone text,
  grade_level text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'parent', 'admin')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'suspended')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id, role)
);

create table public.institution_settings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null unique references public.institutions (id) on delete cascade,
  ai_enabled boolean not null default true,
  ai_daily_message_limit integer not null default 50 check (ai_daily_message_limit >= 0),
  focus_default_minutes integer not null default 25 check (focus_default_minutes > 0),
  allow_parent_view_submissions boolean not null default true,
  allow_student_ai boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Classes, enrolments, guardians, invitations
-- ---------------------------------------------------------------------------

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,                       -- e.g. '10-A'
  grade_level text not null,                -- e.g. 'Class 10'
  section text,
  teacher_id uuid references public.profiles (id) on delete set null,
  academic_year text not null default '2026-27',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name, academic_year)
);

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'removed', 'pending')),
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table public.guardian_links (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  relationship text not null default 'parent'
    check (relationship in ('parent', 'guardian', 'other')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guardian_id, student_id),
  check (guardian_id <> student_id)
);

create table public.role_invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  email text not null,
  role text not null check (role in ('student', 'teacher', 'parent', 'admin')),
  class_id uuid references public.classes (id) on delete set null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, email, role, status)
);

-- ---------------------------------------------------------------------------
-- Subjects & assignments
-- ---------------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  name text not null,                       -- 'Mathematics'
  code text,                                -- 'MATH'
  color text default '#4f46e5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name)
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  class_id uuid references public.classes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  due_at timestamptz,
  total_marks integer check (total_marks is null or total_marks > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Explicit per-student targeting (in addition to the whole-class default).
create table public.assignment_targets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  file_name text not null,
  file_path text not null,                  -- Supabase Storage path
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Submissions & feedback
-- ---------------------------------------------------------------------------

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content_text text,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'graded', 'returned', 'late')),
  marks_obtained numeric(6,2) check (marks_obtained is null or marks_obtained >= 0),
  submitted_at timestamptz,
  graded_at timestamptz,
  graded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.submission_attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  mime_type text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submission_feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Focus timer
-- ---------------------------------------------------------------------------

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  planned_minutes integer not null check (planned_minutes > 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned', 'paused')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.focus_events (
  id uuid primary key default gen_random_uuid(),
  focus_session_id uuid not null references public.focus_sessions (id) on delete cascade,
  event_type text not null
    check (event_type in ('start', 'pause', 'resume', 'complete', 'abandon', 'distraction')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.focus_preferences (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.profiles (id) on delete cascade,
  default_minutes integer not null default 25 check (default_minutes > 0),
  break_minutes integer not null default 5 check (break_minutes >= 0),
  sound_enabled boolean not null default true,
  auto_start_break boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Study goals & plans
-- ---------------------------------------------------------------------------

create table public.study_goals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  subject_id uuid references public.subjects (id) on delete set null,
  target_date date,
  target_minutes_per_day integer check (target_minutes_per_day is null or target_minutes_per_day > 0),
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  generated_by text not null default 'ai'
    check (generated_by in ('ai', 'teacher', 'student')),
  week_start date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_plan_items (
  id uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  assignment_id uuid references public.assignments (id) on delete set null,
  title text not null,
  day_of_week integer not null check (day_of_week between 0 and 6),
  planned_minutes integer not null check (planned_minutes > 0),
  status text not null default 'pending'
    check (status in ('pending', 'done', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI tutor
-- ---------------------------------------------------------------------------

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  subject_id uuid references public.subjects (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used integer check (tokens_used is null or tokens_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  institution_id uuid references public.institutions (id) on delete set null,
  provider text not null,                   -- 'openai' | 'gemini' | 'anthropic'
  model text not null,
  tokens_input integer not null default 0 check (tokens_input >= 0),
  tokens_output integer not null default 0 check (tokens_output >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  success boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Admin-managed provider configuration. Secrets live ONLY in Supabase
-- secrets / env vars — this table stores provider choice and non-secret
-- settings, never API keys.
create table public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions (id) on delete cascade,
  provider text not null check (provider in ('openai', 'gemini', 'anthropic')),
  model text not null,
  is_active boolean not null default false,
  max_tokens integer not null default 1024 check (max_tokens > 0),
  temperature numeric(3,2) not null default 0.70
    check (temperature >= 0 and temperature <= 2),
  system_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, provider)
);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  institution_id uuid references public.institutions (id) on delete set null,
  type text not null
    check (type in ('assignment_published', 'assignment_due', 'submission_graded',
                    'focus_reminder', 'goal_completed', 'guardian_invite',
                    'announcement', 'system')),
  title text not null,
  body text,
  related_assignment_id uuid references public.assignments (id) on delete set null,
  related_submission_id uuid references public.submissions (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  assignment_reminders boolean not null default true,
  grading_alerts boolean not null default true,
  focus_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,                     -- e.g. 'assignment.publish'
  entity_type text,                         -- e.g. 'assignments'
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  for t in select table_name from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'institutions','profiles','institution_memberships','institution_settings',
        'classes','class_enrollments','guardian_links','role_invitations',
        'subjects','assignments','assignment_targets','assignment_attachments',
        'submissions','submission_attachments','submission_feedback',
        'focus_sessions','focus_events','focus_preferences',
        'study_goals','study_plans','study_plan_items',
        'ai_conversations','ai_messages','ai_usage_records','ai_provider_configs',
        'notifications','notification_preferences','audit_logs')
  loop
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I '
      'for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index idx_memberships_user on public.institution_memberships (user_id);
create index idx_memberships_institution on public.institution_memberships (institution_id);
create index idx_classes_institution on public.classes (institution_id);
create index idx_classes_teacher on public.classes (teacher_id);
create index idx_enrollments_class on public.class_enrollments (class_id);
create index idx_enrollments_student on public.class_enrollments (student_id);
create index idx_guardian_links_guardian on public.guardian_links (guardian_id);
create index idx_guardian_links_student on public.guardian_links (student_id);
create index idx_invitations_email on public.role_invitations (email);
create index idx_invitations_token on public.role_invitations (token);
create index idx_subjects_institution on public.subjects (institution_id);
create index idx_assignments_class on public.assignments (class_id);
create index idx_assignments_teacher on public.assignments (teacher_id);
create index idx_assignments_status_due on public.assignments (status, due_at);
create index idx_assignment_targets_assignment on public.assignment_targets (assignment_id);
create index idx_assignment_targets_student on public.assignment_targets (student_id);
create index idx_submissions_assignment on public.submissions (assignment_id);
create index idx_submissions_student on public.submissions (student_id);
create index idx_submissions_status on public.submissions (status);
create index idx_feedback_submission on public.submission_feedback (submission_id);
create index idx_focus_sessions_student on public.focus_sessions (student_id);
create index idx_focus_sessions_started on public.focus_sessions (student_id, started_at desc);
create index idx_focus_events_session on public.focus_events (focus_session_id);
create index idx_study_goals_student on public.study_goals (student_id);
create index idx_study_plans_student on public.study_plans (student_id);
create index idx_plan_items_plan on public.study_plan_items (study_plan_id);
create index idx_ai_conversations_student on public.ai_conversations (student_id);
create index idx_ai_messages_conversation on public.ai_messages (conversation_id);
create index idx_ai_usage_user_day on public.ai_usage_records (user_id, created_at desc);
create index idx_ai_configs_institution on public.ai_provider_configs (institution_id);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id, is_read);
create index idx_audit_institution on public.audit_logs (institution_id, created_at desc);
create index idx_audit_actor on public.audit_logs (actor_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Visibility rules (summary; each policy below enforces them):
--   students: only their own records + assignments targeted to their classes
--   teachers: only their classes and submissions to their assignments
--   parents: only linked children (guardian_links.status = 'accepted')
--   admins: only their own institution (institution_memberships role='admin')

alter table public.institutions enable row level security;
alter table public.profiles enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.institution_settings enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.guardian_links enable row level security;
alter table public.role_invitations enable row level security;
alter table public.subjects enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_targets enable row level security;
alter table public.assignment_attachments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_attachments enable row level security;
alter table public.submission_feedback enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.focus_events enable row level security;
alter table public.focus_preferences enable row level security;
alter table public.study_goals enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_records enable row level security;
alter table public.ai_provider_configs enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs enable row level security;

-- Institutions: members see their own institutions; admins manage theirs.
create policy "institutions_select_member" on public.institutions
  for select using (id in (select public.my_institution_ids()));
create policy "institutions_update_admin" on public.institutions
  for update using (public.is_admin_of(id));

-- Profiles: users see themselves; teachers/admins see members of their
-- institutions; parents see linked children.
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());
create policy "profiles_select_institution" on public.profiles
  for select using (
    id in (select user_id from public.institution_memberships
           where institution_id in (select public.my_institution_ids())));
create policy "profiles_select_guardian_child" on public.profiles
  for select using (public.is_guardian_of(id));
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

-- Memberships: members see memberships of their institutions; admins manage.
create policy "memberships_select_member" on public.institution_memberships
  for select using (institution_id in (select public.my_institution_ids()));
create policy "memberships_insert_admin" on public.institution_memberships
  for insert with check (public.is_admin_of(institution_id));
create policy "memberships_update_admin" on public.institution_memberships
  for update using (public.is_admin_of(institution_id));
create policy "memberships_delete_admin" on public.institution_memberships
  for delete using (public.is_admin_of(institution_id));

-- Institution settings: members read; admins write.
create policy "settings_select_member" on public.institution_settings
  for select using (institution_id in (select public.my_institution_ids()));
create policy "settings_all_admin" on public.institution_settings
  for all using (public.is_admin_of(institution_id));

-- Classes: members of the institution see classes; the assigned teacher and
-- institution admins manage them.
create policy "classes_select_member" on public.classes
  for select using (institution_id in (select public.my_institution_ids()));
create policy "classes_insert_admin_teacher" on public.classes
  for insert with check (
    public.is_admin_of(institution_id)
    or (teacher_id = auth.uid() and institution_id in (select public.my_institution_ids())));
create policy "classes_update_teacher_admin" on public.classes
  for update using (public.teaches_class(id) or public.is_admin_of(institution_id));

-- Enrollments: students see their own; teachers see their classes'; admins
-- see their institution's.
create policy "enrollments_select" on public.class_enrollments
  for select using (
    student_id = auth.uid()
    or public.teaches_class(class_id)
    or public.is_admin_of((select institution_id from public.classes where id = class_id))
    or public.is_guardian_of(student_id));
create policy "enrollments_insert_teacher_admin" on public.class_enrollments
  for insert with check (
    public.teaches_class(class_id)
    or public.is_admin_of((select institution_id from public.classes where id = class_id)));
create policy "enrollments_update_teacher_admin" on public.class_enrollments
  for update using (
    public.teaches_class(class_id)
    or public.is_admin_of((select institution_id from public.classes where id = class_id)));

-- Guardian links: the guardian, the student, and institution admins.
create policy "guardian_links_select" on public.guardian_links
  for select using (
    guardian_id = auth.uid() or student_id = auth.uid()
    or public.is_admin_of((select institution_id from public.institution_memberships
                            where user_id = student_id limit 1)));
create policy "guardian_links_insert" on public.guardian_links
  for insert with check (guardian_id = auth.uid() or student_id = auth.uid());
create policy "guardian_links_update" on public.guardian_links
  for update using (guardian_id = auth.uid() or student_id = auth.uid());

-- Role invitations: admins of the institution manage; invitee reads own.
create policy "invitations_select_admin" on public.role_invitations
  for select using (public.is_admin_of(institution_id));
create policy "invitations_select_invitee" on public.role_invitations
  for select using (email = (select email from public.profiles where id = auth.uid()));
create policy "invitations_insert_admin" on public.role_invitations
  for insert with check (public.is_admin_of(institution_id));
create policy "invitations_update_admin" on public.role_invitations
  for update using (public.is_admin_of(institution_id));

-- Subjects: institution members read; teachers/admins write.
create policy "subjects_select_member" on public.subjects
  for select using (institution_id in (select public.my_institution_ids()));
create policy "subjects_write_teacher_admin" on public.subjects
  for all using (
    public.is_admin_of(institution_id)
    or (public.current_role() = 'teacher'
        and institution_id in (select public.my_institution_ids())));

-- Assignments: teachers see their own; students see published assignments
-- for their classes (or explicitly targeted); guardians see their children's;
-- admins see their institution's.
create policy "assignments_select" on public.assignments
  for select using (
    teacher_id = auth.uid()
    or public.is_admin_of(institution_id)
    or (status = 'published' and public.enrolled_in_class(class_id))
    or (status = 'published' and exists (
        select 1 from public.assignment_targets
        where assignment_id = assignments.id and student_id = auth.uid()))
    or (status = 'published' and exists (
        select 1 from public.guardian_links
        where guardian_id = auth.uid() and status = 'accepted'
          and (public.enrolled_in_class(class_id)
               or student_id in (select student_id from public.assignment_targets
                                 where assignment_id = assignments.id)))));
create policy "assignments_insert_teacher" on public.assignments
  for insert with check (
    teacher_id = auth.uid()
    and institution_id in (select public.my_institution_ids()));
create policy "assignments_update_teacher_admin" on public.assignments
  for update using (
    teacher_id = auth.uid() or public.is_admin_of(institution_id));
create policy "assignments_delete_teacher_admin" on public.assignments
  for delete using (
    teacher_id = auth.uid() or public.is_admin_of(institution_id));

-- Assignment targets: teacher/admin of the assignment; targeted student.
create policy "assignment_targets_select" on public.assignment_targets
  for select using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a
               where a.id = assignment_id
                 and (a.teacher_id = auth.uid() or public.is_admin_of(a.institution_id))));
create policy "assignment_targets_write_teacher_admin" on public.assignment_targets
  for all using (
    exists (select 1 from public.assignments a
            where a.id = assignment_id
              and (a.teacher_id = auth.uid() or public.is_admin_of(a.institution_id))));

-- Assignment attachments: same visibility as the assignment itself.
create policy "assignment_attachments_select" on public.assignment_attachments
  for select using (
    exists (select 1 from public.assignments a
            where a.id = assignment_id
              and (a.teacher_id = auth.uid()
                   or public.is_admin_of(a.institution_id)
                   or (a.status = 'published' and public.enrolled_in_class(a.class_id))
                   or (a.status = 'published' and exists (
                       select 1 from public.assignment_targets t
                       where t.assignment_id = a.id and t.student_id = auth.uid())))));
create policy "assignment_attachments_write_teacher" on public.assignment_attachments
  for all using (
    exists (select 1 from public.assignments a
            where a.id = assignment_id and a.teacher_id = auth.uid()));

-- Submissions: the student; the assignment's teacher; institution admins;
-- guardians of the student.
create policy "submissions_select" on public.submissions
  for select using (
    student_id = auth.uid()
    or public.is_guardian_of(student_id)
    or exists (select 1 from public.assignments a
               where a.id = assignment_id
                 and (a.teacher_id = auth.uid() or public.is_admin_of(a.institution_id))));
create policy "submissions_insert_self" on public.submissions
  for insert with check (student_id = auth.uid());
create policy "submissions_update_self_or_teacher" on public.submissions
  for update using (
    student_id = auth.uid()
    or exists (select 1 from public.assignments a
               where a.id = assignment_id
                 and (a.teacher_id = auth.uid() or public.is_admin_of(a.institution_id))));

-- Submission attachments: same visibility as the submission.
create policy "submission_attachments_select" on public.submission_attachments
  for select using (
    exists (select 1 from public.submissions s
            where s.id = submission_id
              and (s.student_id = auth.uid()
                   or public.is_guardian_of(s.student_id)
                   or exists (select 1 from public.assignments a
                              where a.id = s.assignment_id
                                and (a.teacher_id = auth.uid()
                                     or public.is_admin_of(a.institution_id))))));
create policy "submission_attachments_insert_self" on public.submission_attachments
  for insert with check (
    exists (select 1 from public.submissions s
            where s.id = submission_id and s.student_id = auth.uid()));

-- Feedback: the student, their guardian, the feedback teacher, admins.
create policy "feedback_select" on public.submission_feedback
  for select using (
    teacher_id = auth.uid()
    or exists (select 1 from public.submissions s
               where s.id = submission_id
                 and (s.student_id = auth.uid()
                      or public.is_guardian_of(s.student_id)
                      or exists (select 1 from public.assignments a
                                 where a.id = s.assignment_id
                                   and (a.teacher_id = auth.uid()
                                        or public.is_admin_of(a.institution_id))))));
create policy "feedback_insert_teacher" on public.submission_feedback
  for insert with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.submissions s
                join public.assignments a on a.id = s.assignment_id
                where s.id = submission_id and a.teacher_id = auth.uid()));

-- Focus sessions / events / preferences: the student only (+ guardians read).
create policy "focus_sessions_select" on public.focus_sessions
  for select using (student_id = auth.uid() or public.is_guardian_of(student_id));
create policy "focus_sessions_write_self" on public.focus_sessions
  for all using (student_id = auth.uid());

create policy "focus_events_select" on public.focus_events
  for select using (
    exists (select 1 from public.focus_sessions fs
            where fs.id = focus_session_id
              and (fs.student_id = auth.uid() or public.is_guardian_of(fs.student_id))));
create policy "focus_events_insert_self" on public.focus_events
  for insert with check (
    exists (select 1 from public.focus_sessions fs
            where fs.id = focus_session_id and fs.student_id = auth.uid()));

create policy "focus_preferences_all_self" on public.focus_preferences
  for all using (student_id = auth.uid());

-- Study goals & plans: the student only (+ guardians read).
create policy "study_goals_all_self" on public.study_goals
  for all using (student_id = auth.uid());
create policy "study_goals_select_guardian" on public.study_goals
  for select using (public.is_guardian_of(student_id));

create policy "study_plans_all_self" on public.study_plans
  for all using (student_id = auth.uid());
create policy "study_plans_select_guardian" on public.study_plans
  for select using (public.is_guardian_of(student_id));

create policy "study_plan_items_select" on public.study_plan_items
  for select using (
    exists (select 1 from public.study_plans p
            where p.id = study_plan_id
              and (p.student_id = auth.uid() or public.is_guardian_of(p.student_id))));
create policy "study_plan_items_write_self" on public.study_plan_items
  for all using (
    exists (select 1 from public.study_plans p
            where p.id = study_plan_id and p.student_id = auth.uid()));

-- AI conversations & messages: the owning student only.
create policy "ai_conversations_all_self" on public.ai_conversations
  for all using (student_id = auth.uid());
create policy "ai_messages_select" on public.ai_messages
  for select using (
    exists (select 1 from public.ai_conversations c
            where c.id = conversation_id and c.student_id = auth.uid()));
create policy "ai_messages_insert_self" on public.ai_messages
  for insert with check (
    exists (select 1 from public.ai_conversations c
            where c.id = conversation_id and c.student_id = auth.uid()));

-- AI usage: the user; institution admins read their institution's rows.
create policy "ai_usage_select" on public.ai_usage_records
  for select using (
    user_id = auth.uid()
    or (institution_id is not null and public.is_admin_of(institution_id)));
create policy "ai_usage_insert_self" on public.ai_usage_records
  for insert with check (user_id = auth.uid());

-- AI provider configs: institution admins only.
create policy "ai_configs_all_admin" on public.ai_provider_configs
  for all using (public.is_admin_of(institution_id));

-- Notifications: the recipient only.
create policy "notifications_select_self" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications
  for update using (user_id = auth.uid());
-- Inserts happen via the service role (notification-worker edge function).

-- Notification preferences: the user only.
create policy "notification_preferences_all_self" on public.notification_preferences
  for all using (user_id = auth.uid());

-- Audit logs: institution admins read their institution's logs.
-- Inserts happen via the service role.
create policy "audit_logs_select_admin" on public.audit_logs
  for select using (
    institution_id is not null and public.is_admin_of(institution_id));

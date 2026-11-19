-- FocusEd AI — demo seed data
-- supabase/seed.sql
-- ---------------------------------------------------------------------------
-- CLEARLY LABELLED DEMO DATA. Matches the frontend Demo Mode accounts.
-- Run ONLY on a throwaway/dev Supabase project, never production.
--
-- IMPORTANT: profiles.id references auth.users(id). The UUIDs below are
-- DEMO-ONLY placeholders. In a real project, create the users first through
-- Supabase Auth (sign-up / invite) and use the real auth user IDs, or let
-- the onboarding flow create the profile row. If you run this seed before
-- the auth users exist, the profiles inserts will fail on the FK.
-- Demo passwords are NOT stored anywhere in this repo; demo sign-in in the
-- frontend runs in localStorage Demo Mode and never touches this database.
-- ---------------------------------------------------------------------------

begin;

-- Fixed demo UUIDs (stable so the frontend demo data and this seed agree).
--   student: 11111111-1111-1111-1111-111111111111
--   teacher: 22222222-2222-2222-2222-222222222222
--   parent:  33333333-3333-3333-3333-333333333333
--   admin:   44444444-4444-4444-4444-444444444444

insert into public.institutions (id, name, slug, type, city, state)
values ('a0000000-0000-0000-0000-000000000001', 'Sunrise Public School', 'sunrise-public-school', 'school', 'Bengaluru', 'Karnataka')
on conflict (id) do nothing;

insert into public.institution_settings (institution_id, ai_enabled, ai_daily_message_limit, focus_default_minutes)
values ('a0000000-0000-0000-0000-000000000001', true, 50, 25)
on conflict (institution_id) do nothing;

-- Demo accounts (see note above about auth.users).
insert into public.profiles (id, email, full_name, display_name, role, grade_level) values
  ('11111111-1111-1111-1111-111111111111', 'aarav.demo@focused.ai', 'Aarav Sharma', 'Aarav', 'student', 'Class 10'),
  ('22222222-2222-2222-2222-222222222222', 'priya.demo@focused.ai', 'Ms. Priya Nair', 'Priya', 'teacher', null),
  ('33333333-3333-3333-3333-333333333333', 'parent.demo@focused.ai', 'Rohit Sharma', 'Rohit', 'parent', null),
  ('44444444-4444-4444-4444-444444444444', 'admin.demo@focused.ai', 'Sunrise Admin', 'Admin', 'admin', null)
on conflict (id) do nothing;

insert into public.institution_memberships (institution_id, user_id, role, status, joined_at) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'student', 'active', now()),
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'teacher', 'active', now()),
  ('a0000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'parent', 'active', now()),
  ('a0000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'admin', 'active', now())
on conflict (institution_id, user_id, role) do nothing;

-- Demo class 10-A, taught by Ms. Priya Nair; Aarav enrolled.
insert into public.classes (id, institution_id, name, grade_level, section, teacher_id, academic_year)
values ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10-A', 'Class 10', 'A', '22222222-2222-2222-2222-222222222222', '2026-27')
on conflict (id) do nothing;

insert into public.class_enrollments (class_id, student_id, status)
values ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'active')
on conflict (class_id, student_id) do nothing;

-- Demo parent link: Rohit Sharma is Aarav's parent (accepted).
insert into public.guardian_links (guardian_id, student_id, relationship, status, invited_by)
values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'parent', 'accepted', '22222222-2222-2222-2222-222222222222')
on conflict (guardian_id, student_id) do nothing;

-- Demo subjects.
insert into public.subjects (id, institution_id, name, code, color) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Mathematics', 'MATH', '#4f46e5'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Science', 'SCI', '#059669'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'English', 'ENG', '#dc2626'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'History', 'HIST', '#d97706')
on conflict (id) do nothing;

-- 6 demo assignments across Maths / Science / English / History.
insert into public.assignments (id, institution_id, subject_id, class_id, teacher_id, title, description, due_at, total_marks, status) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Quadratic Equations — Problem Set 4', 'Solve all 10 problems. Show factorisation steps for Q1–Q5 and use the quadratic formula for Q6–Q10.',
   now() + interval '2 days', 20, 'published'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Acids, Bases and Salts — Lab Report', 'Write up the neutralisation experiment: aim, materials, procedure, observations and conclusion.',
   now() + interval '4 days', 15, 'published'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Essay: The Book That Changed My Thinking', 'A 300–400 word essay. Draft in class, final version submitted here.',
   now() + interval '6 days', 10, 'published'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'The French Revolution — Timeline', 'Build a timeline of 12 key events (1789–1799) with one line explaining each.',
   now() + interval '1 day', 10, 'published'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Trigonometry — Heights and Distances', 'Word problems from Chapter 9. Draw a diagram for each question.',
   now() + interval '9 days', 20, 'published'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'Light — Reflection and Refraction (Draft)', 'Draft assignment for next week. Not visible to students yet.',
   now() + interval '12 days', 15, 'draft')
on conflict (id) do nothing;

-- 3 demo submissions by Aarav: one graded with feedback, one submitted, one draft.
insert into public.submissions (id, assignment_id, student_id, content_text, status, marks_obtained, submitted_at, graded_at, graded_by) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'Quadratic equations solved. Q1–Q5 factorised; Q6–Q10 solved with the quadratic formula, discriminant shown for each.',
   'graded', 17, now() - interval '1 day', now() - interval '12 hours', '22222222-2222-2222-2222-222222222222'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
   'Lab report: neutralisation of HCl with NaOH. Observations and pH readings attached.',
   'submitted', null, now() - interval '3 hours', null, null),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111',
   'Draft: opening paragraph on "Wings of Fire" — still writing the middle section.',
   'draft', null, null, null, null)
on conflict (assignment_id, student_id) do nothing;

insert into public.submission_feedback (submission_id, teacher_id, comment)
values ('e0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
        'Good work, Aarav — 17/20. Q7 lost marks: check the sign of the discriminant before taking the square root. Q9 was excellent, clear working throughout.')
on conflict do nothing;

-- Demo focus sessions for Aarav.
insert into public.focus_sessions (id, student_id, subject_id, assignment_id, planned_minutes, actual_minutes, status, started_at, ended_at) values
  ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 25, 25, 'completed', now() - interval '1 day 2 hours', now() - interval '1 day 1 hour 35 minutes'),
  ('f0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 25, 18, 'completed', now() - interval '5 hours', now() - interval '4 hours 42 minutes'),
  ('f0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000003', null, 25, null, 'in_progress', now() - interval '10 minutes', null)
on conflict (id) do nothing;

insert into public.focus_events (focus_session_id, event_type, note) values
  ('f0000000-0000-0000-0000-000000000001', 'start', 'Maths — quadratic equations'),
  ('f0000000-0000-0000-0000-000000000001', 'complete', 'Finished all 25 minutes'),
  ('f0000000-0000-0000-0000-000000000002', 'start', 'Science lab report'),
  ('f0000000-0000-0000-0000-000000000002', 'distraction', 'Phone notification — 2 min break'),
  ('f0000000-0000-0000-0000-000000000002', 'complete', 'Stopped at 18 minutes'),
  ('f0000000-0000-0000-0000-000000000003', 'start', 'English essay draft')
on conflict do nothing;

insert into public.focus_preferences (student_id, default_minutes, break_minutes, sound_enabled)
values ('11111111-1111-1111-1111-111111111111', 25, 5, true)
on conflict (student_id) do nothing;

-- Demo study goal + plan.
insert into public.study_goals (student_id, title, description, subject_id, target_date, target_minutes_per_day, status)
values ('11111111-1111-1111-1111-111111111111', 'Finish Maths Chapter 9 before Friday', 'Complete all exercises in Heights and Distances.',
        'c0000000-0000-0000-0000-000000000001', current_date + 4, 45, 'active')
on conflict do nothing;

insert into public.study_plans (id, student_id, title, generated_by, week_start, status)
values ('f0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Week plan — exam revision', 'ai', date_trunc('week', current_date)::date, 'active')
on conflict (id) do nothing;

insert into public.study_plan_items (study_plan_id, subject_id, title, day_of_week, planned_minutes, status) values
  ('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Maths: trigonometry practice', 1, 45, 'done'),
  ('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'Science: revise acids & bases', 2, 30, 'pending'),
  ('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'English: essay draft', 3, 30, 'pending')
on conflict do nothing;

-- Demo AI conversation (student + assistant).
insert into public.ai_conversations (id, student_id, title, subject_id)
values ('f0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Help with quadratic equations', 'c0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.ai_messages (conversation_id, role, content, tokens_used) values
  ('f0000000-0000-0000-0000-000000000005', 'user', 'How do I solve x² − 5x + 6 = 0?', 12),
  ('f0000000-0000-0000-0000-000000000005', 'assistant', 'Factorise it: find two numbers that multiply to 6 and add to −5. That is −2 and −3, so (x − 2)(x − 3) = 0, giving x = 2 or x = 3. Try the next one yourself and I will check it.', 68)
on conflict do nothing;

-- Demo notifications for Aarav and his parent.
insert into public.notifications (user_id, institution_id, type, title, body, related_assignment_id, is_read) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'assignment_published', 'New assignment: Quadratic Equations — Problem Set 4', 'Maths · Due in 2 days · 20 marks', 'd0000000-0000-0000-0000-000000000001', true),
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'submission_graded', 'Your Maths assignment was graded', 'Quadratic Equations — Problem Set 4: 17/20. Feedback from Ms. Priya Nair.', 'd0000000-0000-0000-0000-000000000001', false),
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'assignment_due', 'Due tomorrow: The French Revolution — Timeline', 'History · 10 marks · Submit before the deadline.', 'd0000000-0000-0000-0000-000000000004', false),
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', 'submission_graded', 'Aarav''s Maths assignment was graded', 'Quadratic Equations — Problem Set 4: 17/20.', 'd0000000-0000-0000-0000-000000000001', false)
on conflict do nothing;

insert into public.notification_preferences (user_id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444')
on conflict (user_id) do nothing;

-- Demo AI provider config (non-secret settings only; keys stay in env vars).
insert into public.ai_provider_configs (institution_id, provider, model, is_active, max_tokens, temperature, system_prompt)
values ('a0000000-0000-0000-0000-000000000001', 'openai', 'gpt-4o-mini', true, 1024, 0.70,
        'You are FocusEd, a friendly homework tutor for school students. Explain step by step, never do the whole assignment for the student, and ask a check question at the end.')
on conflict (institution_id, provider) do nothing;

commit;

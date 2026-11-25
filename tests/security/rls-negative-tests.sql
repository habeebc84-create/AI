-- FocusEd AI — RLS negative authorization tests
-- tests/security/rls-negative-tests.sql
-- ---------------------------------------------------------------------------
-- Purpose: prove that Row Level Security DENIES cross-user access.
-- These are CHECKS, not a test runner. Run them in the Supabase SQL editor
-- (or psql) while impersonating a user with `set local role authenticated`
-- and `set local request.jwt.claims` / auth.uid() via a signed-in session.
--
-- How to run (Supabase SQL editor): open a session as the demo student
-- (Aarav, 11111111-1111-1111-1111-111111111111) and run each block.
-- Expected result for every negative check: 0 rows.
-- Any row returned by a negative check is a SECURITY FAILURE — stop and fix
-- the policy in supabase/migrations/0001_init.sql before shipping.
--
-- Demo UUIDs (see supabase/seed.sql):
--   student Aarav: 11111111-1111-1111-1111-111111111111
--   teacher Priya: 22222222-2222-2222-2222-222222222222
--   parent  Rohit: 33333333-3333-3333-3333-333333333333
--   admin:         44444444-4444-4444-4444-444444444444
--   other student (NOT seeded — insert a second student first if you want
--   a live cross-student check): 55555555-5555-5555-5555-555555555555
-- ---------------------------------------------------------------------------

-- SETUP (run once, as the second student, or via service role):
--   insert into public.profiles (id, email, full_name, role)
--   values ('55555555-5555-5555-5555-555555555555', 'other.demo@focused.ai', 'Other Student', 'student');
--   insert into public.class_enrollments (class_id, student_id)
--   values ('b0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555');
--   insert into public.submissions (assignment_id, student_id, content_text, status)
--   values ('d0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555', 'Other student work', 'submitted');

-- ===========================================================================
-- Run the blocks below AS AARAV (student, 11111111-...). Expect 0 rows each.
-- ===========================================================================

-- NEG-01: student reads another student's submission -> 0 rows
select 'NEG-01 FAIL: cross-student submission visible' as result, id
from public.submissions
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-02: student reads another student's focus sessions -> 0 rows
select 'NEG-02 FAIL: cross-student focus session visible' as result, id
from public.focus_sessions
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-03: student reads another student's AI conversations -> 0 rows
select 'NEG-03 FAIL: cross-student AI conversation visible' as result, id
from public.ai_conversations
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-04: student reads another student's AI messages -> 0 rows
select 'NEG-04 FAIL: cross-student AI message visible' as result, m.id
from public.ai_messages m
join public.ai_conversations c on c.id = m.conversation_id
where c.student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-05: student reads another student's study goals / plans -> 0 rows
select 'NEG-05 FAIL: cross-student study goal visible' as result, id
from public.study_goals
where student_id = '55555555-5555-5555-5555-555555555555';

select 'NEG-05b FAIL: cross-student study plan visible' as result, id
from public.study_plans
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-06: student reads another student's notifications -> 0 rows
select 'NEG-06 FAIL: cross-student notification visible' as result, id
from public.notifications
where user_id = '55555555-5555-5555-5555-555555555555';

-- NEG-07: student sees a DRAFT assignment (not published) -> 0 rows
select 'NEG-07 FAIL: draft assignment visible to student' as result, id
from public.assignments
where status = 'draft';

-- NEG-08: student reads AI provider configs (admin-only) -> 0 rows
select 'NEG-08 FAIL: provider config visible to student' as result, id
from public.ai_provider_configs;

-- NEG-09: student reads audit logs (admin-only) -> 0 rows
select 'NEG-09 FAIL: audit log visible to student' as result, id
from public.audit_logs;

-- NEG-10: student updates another student's submission -> 0 rows affected
-- (run and check the command tag: UPDATE 0)
update public.submissions
set content_text = 'tampered'
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-11: student deletes another student's focus session -> 0 rows affected
delete from public.focus_sessions
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-12: student reads guardian links of another family -> 0 rows
select 'NEG-12 FAIL: unrelated guardian link visible' as result, id
from public.guardian_links
where student_id = '55555555-5555-5555-5555-555555555555';

-- NEG-13: authenticated users cannot forge accepted guardian links.
-- The INSERT must fail with insufficient_privilege (42501); if it succeeds,
-- immediately roll back and treat this as a security failure.
insert into public.guardian_links (guardian_id, student_id, relationship, status)
values ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'parent', 'accepted');

-- NEG-14: users cannot elevate their profile role to teacher.
-- The UPDATE must fail with insufficient_privilege (42501).
update public.profiles set role = 'teacher'
where id = '11111111-1111-1111-1111-111111111111';

-- ===========================================================================
-- POSITIVE controls (same session, Aarav). These MUST return rows — if a
-- positive control returns 0, the policy is too strict, not just secure.
-- ===========================================================================

-- POS-01: Aarav sees his own submissions (expect 3 rows from seed)
select 'POS-01' as check, count(*) as rows_visible
from public.submissions
where student_id = '11111111-1111-1111-1111-111111111111';

-- POS-02: Aarav sees published assignments for class 10-A (expect 5 rows)
select 'POS-02' as check, count(*) as rows_visible
from public.assignments
where status = 'published';

-- POS-03: Aarav sees his own focus sessions (expect 3 rows from seed)
select 'POS-03' as check, count(*) as rows_visible
from public.focus_sessions
where student_id = '11111111-1111-1111-1111-111111111111';

-- ===========================================================================
-- Run the blocks below AS THE DEMO PARENT (Rohit, 33333333-...).
-- ===========================================================================

-- NEG-P1: parent reads a submission of a student they are NOT linked to -> 0 rows
select 'NEG-P1 FAIL: unlinked student submission visible to parent' as result, id
from public.submissions
where student_id = '55555555-5555-5555-5555-555555555555';

-- POS-P1: parent sees linked child's submissions (expect 3 rows from seed)
select 'POS-P1' as check, count(*) as rows_visible
from public.submissions
where student_id = '11111111-1111-1111-1111-111111111111';

-- ===========================================================================
-- Run the blocks below AS THE DEMO TEACHER (Priya, 22222222-...).
-- ===========================================================================

-- NEG-T1: teacher reads AI conversations (student-private) -> 0 rows
select 'NEG-T1 FAIL: student AI conversation visible to teacher' as result, id
from public.ai_conversations;

-- NEG-T2: teacher reads provider configs (admin-only) -> 0 rows
select 'NEG-T2 FAIL: provider config visible to teacher' as result, id
from public.ai_provider_configs;

-- POS-T1: teacher sees submissions to her assignments (expect 3 rows from seed)
select 'POS-T1' as check, count(*) as rows_visible
from public.submissions s
join public.assignments a on a.id = s.assignment_id
where a.teacher_id = '22222222-2222-2222-2222-222222222222';

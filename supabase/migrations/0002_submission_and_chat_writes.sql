-- Keep student work, instructor grading, and model-generated messages distinguishable.
-- Install this migration before updating the ai-tutor function.
begin;

-- The assignments and assignment_targets read policies refer to each other.
-- Evaluate this narrow ownership check against base tables without entering that cycle.
create function public.can_start_submission(assignment uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = assignment and a.status = 'published'
      and (
        public.enrolled_in_class(a.class_id)
        or exists (
          select 1 from public.assignment_targets t
          where t.assignment_id = a.id and t.student_id = auth.uid()
        )
      )
  );
$$;

create function public.can_manage_submission(assignment uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where a.id = assignment and (
      a.teacher_id = auth.uid() or exists (
        select 1 from public.institution_memberships m
        where m.institution_id = a.institution_id and m.user_id = auth.uid()
          and m.role = 'admin' and m.status = 'active'
      )
    )
  );
$$;

revoke all on function public.can_start_submission(uuid) from public, anon;
revoke all on function public.can_manage_submission(uuid) from public, anon;
grant execute on function public.can_start_submission(uuid) to authenticated;
grant execute on function public.can_manage_submission(uuid) to authenticated;

alter policy "submissions_insert_self" on public.submissions
  to authenticated with check (
    student_id = auth.uid() and public.can_start_submission(assignment_id)
    and status = 'draft' and marks_obtained is null and graded_by is null
    and graded_at is null and submitted_at is null
  );

-- The authenticated student's submit action uses the service-side handler to
-- check the owner, draft state and due date before assigning submitted or late.
alter policy "submissions_update_self_or_teacher" on public.submissions
  to authenticated using (
    (student_id = auth.uid() and status = 'draft')
    or public.can_manage_submission(assignment_id)
  ) with check (
    (student_id = auth.uid() and status = 'draft' and marks_obtained is null
      and graded_by is null and graded_at is null and submitted_at is null)
    or public.can_manage_submission(assignment_id)
  );

-- Keep the old-row and new-row policy checks anchored to the same assignment
-- and student. Column checks alone permit moving a row into another domain.
create function public.keep_submission_owner()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' and (
    old.id is distinct from new.id or old.assignment_id is distinct from new.assignment_id
    or old.student_id is distinct from new.student_id
  ) then
    raise exception 'Submission identity cannot be reassigned' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger submissions_keep_owner before update of id, assignment_id, student_id
  on public.submissions for each row execute function public.keep_submission_owner();

-- Old assistant messages have no trustworthy provenance. Preserve the transcript
-- for display but allow only newly recorded provider replies into model history.
alter table public.ai_messages add column provider_generated boolean not null default false;
alter policy "ai_messages_insert_self" on public.ai_messages
  to authenticated with check (
    role = 'user' and not provider_generated and exists (
      select 1 from public.ai_conversations c
      where c.id = conversation_id and c.student_id = auth.uid()
    )
  );
commit;

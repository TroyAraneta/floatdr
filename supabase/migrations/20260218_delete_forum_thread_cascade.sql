-- Deletes a forum thread and all dependent forum data in a single transaction.
-- Authorization: thread author OR admin/head_admin.
create or replace function public.delete_forum_thread_cascade(p_thread_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_author_id uuid;
  v_is_admin boolean := false;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select t.author_id
  into v_author_id
  from public.forum_threads t
  where t.id = p_thread_id;

  if v_author_id is null then
    raise exception 'Thread not found';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = v_uid
      and (
        coalesce(p.is_admin, false) = true
        or p.admin_role in ('admin', 'head_admin')
      )
  )
  into v_is_admin;

  if v_uid <> v_author_id and not v_is_admin then
    raise exception 'Not allowed';
  end if;

  -- Child rows first.
  delete from public.reply_reactions
  where reply_id in (
    select r.id
    from public.forum_replies r
    where r.thread_id = p_thread_id
  );

  delete from public.forum_replies
  where thread_id = p_thread_id;

  delete from public.thread_reactions
  where thread_id = p_thread_id;

  delete from public.saved_threads
  where thread_id = p_thread_id;

  delete from public.moderation_reports
  where thread_id = p_thread_id;

  -- Parent row last.
  delete from public.forum_threads
  where id = p_thread_id;
end;
$$;

revoke all on function public.delete_forum_thread_cascade(uuid) from public;
grant execute on function public.delete_forum_thread_cascade(uuid) to authenticated;

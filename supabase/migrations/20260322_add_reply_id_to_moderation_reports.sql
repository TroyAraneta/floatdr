alter table public.moderation_reports
add column if not exists reply_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'moderation_reports_reply_id_fkey'
  ) then
    alter table public.moderation_reports
    add constraint moderation_reports_reply_id_fkey
    foreign key (reply_id)
    references public.forum_replies(id)
    on delete cascade;
  end if;
end
$$;

create index if not exists moderation_reports_reply_id_idx
on public.moderation_reports(reply_id);

begin;

alter table public.profiles
  add column if not exists admin_role text not null default 'user';

alter table public.profiles
  drop constraint if exists profiles_admin_role_check;

alter table public.profiles
  add constraint profiles_admin_role_check
  check (admin_role in ('user', 'admin', 'head_admin'));

update public.profiles
set admin_role = 'admin'
where admin_role = 'user'
  and is_admin is true;

-- Helper (manual): pick a head admin if needed
-- select id, username from public.profiles order by created_at asc limit 1;
-- update public.profiles set admin_role = 'head_admin' where id = 'UUID_HERE';

create or replace function public.is_head_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.id = uid
      and p.admin_role = 'head_admin'
  );
$$;

create or replace function public.set_admin_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_role not in ('user', 'admin', 'head_admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  if not public.is_head_admin(auth.uid()) then
    raise exception 'Only head admins can change roles';
  end if;

  if target_user_id = auth.uid() and new_role <> 'head_admin' then
    raise exception 'Head admin cannot demote themselves';
  end if;

  update public.profiles
  set admin_role = new_role,
      is_admin = (new_role in ('admin', 'head_admin')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.list_admins()
returns table(id uuid, username text, admin_role text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_head_admin(auth.uid()) then
    raise exception 'Only head admins can list admins';
  end if;

  return query
    select p.id, p.username, p.admin_role, p.updated_at
    from public.profiles p
    where p.admin_role <> 'user'
    order by p.admin_role desc, p.updated_at desc;
end;
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles
  for select
  using (true);

commit;

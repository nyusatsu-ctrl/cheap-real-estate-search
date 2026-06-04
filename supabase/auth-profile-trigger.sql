create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    subscription_status,
    trial_ends_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'viewer',
    'trialing',
    now() + interval '14 days'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

insert into public.profiles (
  id,
  email,
  role,
  subscription_status,
  trial_ends_at
)
select
  users.id,
  coalesce(users.email, ''),
  'viewer',
  'trialing',
  now() + interval '14 days'
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

create extension if not exists "pgcrypto";

alter table public.profiles
  add column if not exists trial_started_at timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

update public.profiles p
set trial_started_at = p.created_at
where p.trial_started_at is null
  and p.trial_ends_at is not null;

do $$
begin
  if to_regclass('public.users') is not null then
    execute $update_users$
      update public.profiles p
      set trial_started_at = coalesce(u.trial_started_at, p.trial_started_at)
      from public.users u
      where u.id = p.id
        and p.trial_ends_at is not null
    $update_users$;
  end if;

  if to_regclass('public.subscriptions') is not null then
    execute $update_subscriptions$
      update public.profiles p
      set
        subscription_status = case
          when p.stripe_subscription_id is null
            and s.stripe_subscription_id is not null
            and s.status in ('active', 'past_due', 'canceled', 'unpaid')
          then s.status
          else p.subscription_status
        end,
        current_period_end = coalesce(p.current_period_end, s.current_period_end),
        stripe_customer_id = coalesce(p.stripe_customer_id, s.stripe_customer_id),
        stripe_subscription_id = coalesce(p.stripe_subscription_id, s.stripe_subscription_id)
      from public.subscriptions s
      where s.user_id = p.id
    $update_subscriptions$;
  end if;
end;
$$;

create table if not exists public.property_trial_claims (
  email_hash text primary key,
  first_user_id uuid not null,
  latest_user_id uuid not null,
  first_claimed_at timestamptz not null default now(),
  last_regranted_at timestamptz,
  regrant_count integer not null default 0 check (regrant_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.property_trial_claims (
  email_hash,
  first_user_id,
  latest_user_id,
  first_claimed_at
)
select
  encode(extensions.digest(existing_profile.normalized_email, 'sha256'), 'hex'),
  existing_profile.id,
  existing_profile.id,
  existing_profile.first_claimed_at
from (
  select distinct on (lower(trim(p.email)))
    p.id,
    lower(trim(p.email)) as normalized_email,
    coalesce(p.trial_started_at, p.created_at) as first_claimed_at
  from public.profiles p
  where trim(p.email) <> ''
  order by
    lower(trim(p.email)),
    coalesce(p.trial_started_at, p.created_at) asc,
    p.id asc
) existing_profile
on conflict (email_hash) do update set
  latest_user_id = excluded.latest_user_id,
  updated_at = now();

create table if not exists public.property_payment_events (
  event_id text primary key,
  event_type text not null,
  user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists property_payment_events_received_idx
on public.property_payment_events (received_at desc);

create index if not exists property_payment_events_subscription_idx
on public.property_payment_events (stripe_subscription_id)
where stripe_subscription_id is not null;

create or replace function public.can_access_properties()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.subscription_status = 'trialing'
          and p.trial_started_at is not null
          and p.trial_ends_at is not null
          and p.trial_started_at <= now()
          and p.trial_ends_at > now()
          and p.trial_ends_at > p.trial_started_at
        )
        or (
          p.subscription_status = 'active'
          and p.current_period_end is not null
          and p.current_period_end > now()
        )
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_email_hash text;
  existing_claim text;
  trial_start timestamptz := now();
  trial_end timestamptz := now() + interval '14 days';
begin
  normalized_email := lower(trim(coalesce(new.email, '')));
  if normalized_email = '' then
    raise exception 'email is required for property trial registration';
  end if;
  normalized_email_hash := encode(extensions.digest(normalized_email, 'sha256'), 'hex');

  select email_hash
  into existing_claim
  from public.property_trial_claims
  where email_hash = normalized_email_hash
  for update;

  if existing_claim is null then
    insert into public.property_trial_claims (
      email_hash,
      first_user_id,
      latest_user_id,
      first_claimed_at
    )
    values (
      normalized_email_hash,
      new.id,
      new.id,
      trial_start
    );
  else
    update public.property_trial_claims
    set
      latest_user_id = new.id,
      updated_at = now()
    where email_hash = normalized_email_hash;
    trial_end := trial_start;
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    subscription_status,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    normalized_email,
    'viewer',
    case when existing_claim is null then 'trialing' else 'canceled' end,
    trial_start,
    trial_end
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

create or replace function public.admin_regrant_property_trial(
  target_user_id uuid,
  trial_days integer default 14
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  target_email_hash text;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin access required';
  end if;
  if trial_days < 1 or trial_days > 31 then
    raise exception 'trial_days must be between 1 and 31';
  end if;

  select lower(trim(email))
  into target_email
  from public.profiles
  where id = target_user_id;
  if target_email is null then
    raise exception 'profile not found';
  end if;
  target_email_hash := encode(extensions.digest(target_email, 'sha256'), 'hex');

  update public.profiles
  set
    subscription_status = 'trialing',
    trial_started_at = now(),
    trial_ends_at = now() + make_interval(days => trial_days),
    current_period_end = null,
    cancel_at_period_end = false,
    updated_at = now()
  where id = target_user_id;

  insert into public.property_trial_claims (
    email_hash,
    first_user_id,
    latest_user_id,
    first_claimed_at,
    last_regranted_at,
    regrant_count
  )
  values (
    target_email_hash,
    target_user_id,
    target_user_id,
    now(),
    now(),
    1
  )
  on conflict (email_hash) do update set
    latest_user_id = excluded.latest_user_id,
    last_regranted_at = now(),
    regrant_count = public.property_trial_claims.regrant_count + 1,
    updated_at = now();
end;
$$;

alter table public.property_trial_claims enable row level security;
alter table public.property_payment_events enable row level security;

drop policy if exists "profiles_self_insert" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;

drop policy if exists "property_trial_claims_admin_read" on public.property_trial_claims;
create policy "property_trial_claims_admin_read"
on public.property_trial_claims for select
to authenticated
using (public.is_admin());

drop policy if exists "property_payment_events_admin_read" on public.property_payment_events;
create policy "property_payment_events_admin_read"
on public.property_payment_events for select
to authenticated
using (public.is_admin());

drop policy if exists "properties_public_published_read" on public.properties;
drop policy if exists "properties_member_read" on public.properties;
create policy "properties_member_read"
on public.properties for select
to authenticated
using (status = 'published' and public.can_access_properties());

drop policy if exists "images_public_for_published_properties" on public.property_images;
drop policy if exists "images_member_for_published_properties" on public.property_images;
create policy "images_member_for_published_properties"
on public.property_images for select
to authenticated
using (
  public.can_access_properties()
  and exists (
    select 1
    from public.properties
    where properties.id = property_images.property_id
      and properties.status = 'published'
  )
);

drop policy if exists "saved_properties_owner_read" on public.saved_properties;
create policy "saved_properties_owner_read"
on public.saved_properties for select
to authenticated
using (
  (profile_id = auth.uid() and public.can_access_properties())
  or public.is_admin()
);

drop policy if exists "saved_properties_owner_insert" on public.saved_properties;
create policy "saved_properties_owner_insert"
on public.saved_properties for insert
to authenticated
with check (
  profile_id = auth.uid()
  and public.can_access_properties()
);

drop policy if exists "saved_properties_owner_delete" on public.saved_properties;
create policy "saved_properties_owner_delete"
on public.saved_properties for delete
to authenticated
using (
  (profile_id = auth.uid() and public.can_access_properties())
  or public.is_admin()
);

revoke select on public.properties from anon;
revoke select on public.property_images from anon;

grant select on public.properties to authenticated;
grant select on public.property_images to authenticated;
grant select on public.property_trial_claims to authenticated;
grant select on public.property_payment_events to authenticated;
grant execute on function public.can_access_properties() to authenticated;
grant execute on function public.admin_regrant_property_trial(uuid, integer) to authenticated, service_role;
grant all on public.property_trial_claims to service_role;
grant all on public.property_payment_events to service_role;

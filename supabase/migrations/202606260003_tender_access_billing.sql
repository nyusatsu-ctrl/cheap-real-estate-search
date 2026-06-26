-- Tender-only access control and billing preparation.
-- Apply this to the dedicated /tenders Supabase project.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tender_user_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  email_hash text not null,
  product_code text not null default 'tenders' check (product_code = 'tenders'),
  subscription_status text not null default 'trialing' check (
    subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'expired', 'admin')
  ),
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_customer_id text,
  payment_subscription_id text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_user_access_user_unique unique (user_id, product_code),
  constraint tender_user_access_email_hash_unique unique (email_hash, product_code),
  constraint tender_user_access_customer_unique unique (payment_customer_id),
  constraint tender_user_access_subscription_unique unique (payment_subscription_id)
);

create table if not exists public.tender_payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  user_id uuid,
  payment_customer_id text,
  payment_subscription_id text,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

drop trigger if exists tender_user_access_set_updated_at on public.tender_user_access;
create trigger tender_user_access_set_updated_at
before update on public.tender_user_access
for each row execute function public.set_updated_at();

create index if not exists tender_user_access_status_idx
on public.tender_user_access (subscription_status, trial_ends_at, current_period_end);

create index if not exists tender_user_access_product_updated_idx
on public.tender_user_access (product_code, updated_at desc);

create index if not exists tender_payment_events_processed_idx
on public.tender_payment_events (processed_at desc);

alter table public.tender_user_access enable row level security;
alter table public.tender_payment_events enable row level security;

drop policy if exists "tender_user_access_owner_read" on public.tender_user_access;
create policy "tender_user_access_owner_read"
on public.tender_user_access for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tender_user_access_owner_update_limited" on public.tender_user_access;
drop policy if exists "tender_user_access_owner_update" on public.tender_user_access;

revoke update on public.tender_user_access from authenticated;
grant select on public.tender_user_access to authenticated;
grant all on public.tender_user_access to service_role;
grant all on public.tender_payment_events to service_role;

create or replace function public.expire_tender_trials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.tender_user_access
  set subscription_status = 'expired'
  where product_code = 'tenders'
    and subscription_status = 'trialing'
    and trial_ends_at is not null
    and trial_ends_at <= now();

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

grant execute on function public.expire_tender_trials() to service_role;

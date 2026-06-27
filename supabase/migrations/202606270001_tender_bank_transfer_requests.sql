-- Tender-only bank transfer requests and manual access grants.
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

create or replace function public.tender_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.tender_user_access
  add column if not exists billing_source text not null default 'stripe',
  add column if not exists manual_access_note text;

alter table public.tender_user_access
  drop constraint if exists tender_user_access_billing_source_check;

alter table public.tender_user_access
  add constraint tender_user_access_billing_source_check
  check (billing_source in ('stripe', 'manual_bank_transfer'));

create table if not exists public.tender_bank_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_code text not null default 'tenders' check (product_code = 'tenders'),
  email text not null,
  company_name text not null,
  contact_name text not null,
  phone text not null,
  invoice_name text not null,
  desired_start_date date,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid', 'activated', 'canceled')),
  admin_note text,
  activated_at timestamptz,
  activated_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tender_bank_transfer_requests_set_updated_at on public.tender_bank_transfer_requests;
create trigger tender_bank_transfer_requests_set_updated_at
before update on public.tender_bank_transfer_requests
for each row execute function public.set_updated_at();

create index if not exists tender_bank_transfer_requests_user_idx
on public.tender_bank_transfer_requests (user_id, created_at desc);

create index if not exists tender_bank_transfer_requests_status_idx
on public.tender_bank_transfer_requests (status, created_at desc);

create index if not exists tender_user_access_billing_source_idx
on public.tender_user_access (billing_source, current_period_end);

alter table public.tender_bank_transfer_requests enable row level security;

drop policy if exists "tender_bank_transfer_owner_select" on public.tender_bank_transfer_requests;
create policy "tender_bank_transfer_owner_select"
on public.tender_bank_transfer_requests for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tender_bank_transfer_owner_insert" on public.tender_bank_transfer_requests;
create policy "tender_bank_transfer_owner_insert"
on public.tender_bank_transfer_requests for insert
to authenticated
with check (
  user_id = auth.uid()
  and product_code = 'tenders'
  and status = 'pending'
);

drop policy if exists "tender_bank_transfer_admin_all" on public.tender_bank_transfer_requests;
create policy "tender_bank_transfer_admin_all"
on public.tender_bank_transfer_requests for all
to authenticated
using (public.tender_is_admin())
with check (public.tender_is_admin());

grant select, insert, update, delete on public.tender_bank_transfer_requests to authenticated;
grant all on public.tender_bank_transfer_requests to service_role;
grant execute on function public.tender_is_admin() to authenticated, service_role;

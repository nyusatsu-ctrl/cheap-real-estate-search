-- Baseline for the sales contract schema that previously lived in
-- supabase/sales-contracts.sql. The version is intentionally ordered before
-- 20260828083618_create_sales_econtracts.sql, which depends on these tables.

create extension if not exists "pgcrypto";

create table if not exists public.sales_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kana text,
  postal_code text,
  address text,
  phone text,
  email text,
  birth_date date,
  occupation text,
  employer_name text,
  employer_phone text,
  annual_income integer check (annual_income is null or annual_income >= 0),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.sales_customers(id) on delete restrict,
  source_system text,
  source_row_key text,
  source_row_number integer check (source_row_number is null or source_row_number >= 1),
  source_received_at timestamptz,
  source_snapshot_json jsonb,
  contract_date date,
  delivery_date date,
  vehicle_type text not null check (vehicle_type in ('car', 'bike')),
  contract_type text not null check (contract_type in ('cash', 'loan', 'lease')),
  sale_price bigint check (sale_price is null or sale_price >= 0),
  fees bigint check (fees is null or fees >= 0),
  total_price bigint check (total_price is null or total_price >= 0),
  down_payment bigint check (down_payment is null or down_payment >= 0),
  trade_in_amount bigint check (trade_in_amount is null or trade_in_amount >= 0),
  financed_amount bigint check (financed_amount is null or financed_amount >= 0),
  staff_name text,
  status text not null default 'contracted' check (status in (
    'contract_candidate',
    'negotiating',
    'terms_pending',
    'contracted',
    'waiting_delivery',
    'delivered',
    'repayment',
    'payment_delay_contacted',
    'payoff_scheduled',
    'paid_off',
    'leasing',
    'lease_ended',
    'completed',
    'cancelled',
    'trouble'
  )),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (not (vehicle_type = 'bike' and contract_type = 'lease'))
);

create table if not exists public.sales_vehicles (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  vehicle_type text not null check (vehicle_type in ('car', 'bike')),
  maker text,
  model text,
  grade text,
  model_year integer check (model_year is null or (model_year >= 1900 and model_year <= 2100)),
  mileage integer check (mileage is null or mileage >= 0),
  color text,
  chassis_number text,
  registration_number text,
  inspection_expiry_date date,
  compulsory_insurance_expiry_date date,
  warranty_period text,
  gps_installed boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_loans (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  finance_company text not null check (finance_company in ('premium', 'aplus', 'ast')),
  application_number text,
  contract_number text,
  approval_status text check (approval_status is null or approval_status in ('unrequested', 'pending', 'approved', 'guarantor_required', 'rejected')),
  interest_rate numeric(6,3) check (interest_rate is null or interest_rate >= 0),
  principal bigint check (principal is null or principal >= 0),
  installment_count integer check (installment_count is null or installment_count > 0),
  initial_payment_amount bigint check (initial_payment_amount is null or initial_payment_amount >= 0),
  monthly_payment bigint check (monthly_payment is null or monthly_payment >= 0),
  final_payment_amount bigint check (final_payment_amount is null or final_payment_amount >= 0),
  bonus_payment_enabled boolean not null default false,
  bonus_payment_amount bigint check (bonus_payment_amount is null or bonus_payment_amount >= 0),
  first_payment_date date,
  final_payment_date date,
  total_payment_amount bigint check (total_payment_amount is null or total_payment_amount >= 0),
  ownership_retention boolean not null default false,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_leases (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  lease_company text not null check (lease_company in ('premium', 'aplus_showa')),
  partner_company text,
  contract_number text,
  lease_months integer check (lease_months is null or lease_months > 0),
  initial_payment_amount bigint check (initial_payment_amount is null or initial_payment_amount >= 0),
  monthly_lease_fee bigint check (monthly_lease_fee is null or monthly_lease_fee >= 0),
  final_payment_amount bigint check (final_payment_amount is null or final_payment_amount >= 0),
  bonus_payment_enabled boolean not null default false,
  bonus_payment_amount bigint check (bonus_payment_amount is null or bonus_payment_amount >= 0),
  lease_start_date date,
  lease_end_date date,
  residual_value_enabled boolean not null default false,
  residual_value_amount bigint check (residual_value_amount is null or residual_value_amount >= 0),
  maintenance_included boolean not null default false,
  owner_name text,
  user_name text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_guarantors (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  name text not null,
  kana text,
  relationship text,
  postal_code text,
  address text,
  phone text,
  employer_name text,
  employer_phone text,
  annual_income integer check (annual_income is null or annual_income >= 0),
  identity_document_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_documents (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  document_type text not null,
  title text,
  file_url text,
  storage_path text,
  visibility text not null default 'admin' check (visibility in ('admin', 'staff', 'public')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_contact_histories (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  customer_id uuid references public.sales_customers(id) on delete restrict,
  handled_at timestamptz,
  handled_by text,
  method text not null default 'phone' check (method in ('phone', 'line', 'email', 'sms', 'visit', 'other')),
  content text not null,
  next_action_date date,
  status text not null default 'normal' check (status in ('normal', 'caution', 'payment_delay', 'repair_consultation', 'complaint', 'completed')),
  attachment_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  target_table text not null,
  target_id uuid,
  action text not null,
  before_json jsonb,
  after_json jsonb,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_lease_maturities (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  lease_id uuid not null references public.sales_leases(id) on delete restrict,
  maturity_date date,
  maturity_status text not null default 'not_started' check (maturity_status in (
    'not_started',
    'notified',
    'waiting_response',
    'purchase_planned',
    'renewal_planned',
    'return_planned',
    'completed'
  )),
  customer_choice text not null default 'undecided' check (customer_choice in (
    'undecided',
    'purchase',
    'renewal',
    'return'
  )),
  residual_value_amount bigint check (residual_value_amount is null or residual_value_amount >= 0),
  maturity_mileage integer check (maturity_mileage is null or maturity_mileage >= 0),
  contracted_mileage_limit integer check (contracted_mileage_limit is null or contracted_mileage_limit >= 0),
  mileage_over_limit boolean not null default false,
  mileage_excess_km integer check (mileage_excess_km is null or mileage_excess_km >= 0),
  mileage_overage_rate_yen integer check (mileage_overage_rate_yen is null or mileage_overage_rate_yen >= 0),
  mileage_overage_amount bigint check (mileage_overage_amount is null or mileage_overage_amount >= 0),
  vehicle_condition_memo text,
  condition_settlement_amount bigint check (condition_settlement_amount is null or condition_settlement_amount >= 0),
  additional_settlement_amount bigint check (additional_settlement_amount is null or additional_settlement_amount >= 0),
  additional_settlement_reason text,
  renewal_maintenance_fee_amount bigint check (renewal_maintenance_fee_amount is null or renewal_maintenance_fee_amount >= 0),
  final_settlement_amount bigint check (final_settlement_amount is null or final_settlement_amount >= 0),
  purchase_payment_due_date date,
  purchase_paid_date date,
  renewal_contract_id uuid references public.sales_contracts(id) on delete restrict,
  return_scheduled_date date,
  return_completed_date date,
  maturity_notice_sent_date date,
  next_contact_date date,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sales_lease_maturity_histories (
  id uuid primary key default gen_random_uuid(),
  maturity_id uuid not null references public.sales_lease_maturities(id) on delete restrict,
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  customer_id uuid references public.sales_customers(id) on delete restrict,
  handled_at timestamptz,
  handled_by text,
  method text not null default 'phone' check (method in ('phone', 'line', 'email', 'sms', 'visit', 'other')),
  content text not null,
  next_action_date date,
  status text not null default 'normal' check (status in ('normal', 'caution', 'payment_delay', 'repair_consultation', 'complaint', 'completed')),
  attachment_url text,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.sales_loans
  add column if not exists initial_payment_amount bigint check (initial_payment_amount is null or initial_payment_amount >= 0),
  add column if not exists final_payment_amount bigint check (final_payment_amount is null or final_payment_amount >= 0);

alter table public.sales_leases
  add column if not exists initial_payment_amount bigint check (initial_payment_amount is null or initial_payment_amount >= 0),
  add column if not exists final_payment_amount bigint check (final_payment_amount is null or final_payment_amount >= 0);

alter table public.sales_lease_maturities
  add column if not exists mileage_excess_km integer
    check (mileage_excess_km is null or mileage_excess_km >= 0),
  add column if not exists mileage_overage_rate_yen integer
    check (mileage_overage_rate_yen is null or mileage_overage_rate_yen >= 0),
  add column if not exists mileage_overage_amount bigint
    check (mileage_overage_amount is null or mileage_overage_amount >= 0),
  add column if not exists condition_settlement_amount bigint
    check (condition_settlement_amount is null or condition_settlement_amount >= 0),
  add column if not exists renewal_maintenance_fee_amount bigint
    check (renewal_maintenance_fee_amount is null or renewal_maintenance_fee_amount >= 0);

-- The legacy script added these values only to CREATE TABLE. Rebuild the
-- generated constraint so databases that already ran an older copy receive
-- the complete status set without rewriting existing rows.
alter table public.sales_contracts
  drop constraint if exists sales_contracts_status_check;

alter table public.sales_contracts
  add constraint sales_contracts_status_check check (status in (
    'contract_candidate',
    'negotiating',
    'terms_pending',
    'contracted',
    'waiting_delivery',
    'delivered',
    'repayment',
    'payment_delay_contacted',
    'payoff_scheduled',
    'paid_off',
    'leasing',
    'lease_ended',
    'completed',
    'cancelled',
    'trouble'
  )) not valid;

alter table public.sales_contracts
  validate constraint sales_contracts_status_check;

create index if not exists sales_customers_name_idx on public.sales_customers(name);
create index if not exists sales_customers_phone_idx on public.sales_customers(phone);
create index if not exists sales_customers_deleted_at_idx on public.sales_customers(deleted_at);

create index if not exists sales_contracts_customer_id_idx on public.sales_contracts(customer_id);
create index if not exists sales_contracts_status_idx on public.sales_contracts(status);
create index if not exists sales_contracts_vehicle_type_idx on public.sales_contracts(vehicle_type);
create index if not exists sales_contracts_contract_type_idx on public.sales_contracts(contract_type);
create index if not exists sales_contracts_source_row_key_idx on public.sales_contracts(source_row_key);
create index if not exists sales_contracts_updated_at_idx on public.sales_contracts(updated_at desc);
create index if not exists sales_contracts_deleted_at_idx on public.sales_contracts(deleted_at);

create index if not exists sales_vehicles_contract_id_idx on public.sales_vehicles(contract_id);
create index if not exists sales_vehicles_model_idx on public.sales_vehicles(model);
create index if not exists sales_vehicles_chassis_number_idx on public.sales_vehicles(chassis_number);
create index if not exists sales_vehicles_registration_number_idx on public.sales_vehicles(registration_number);
create index if not exists sales_vehicles_deleted_at_idx on public.sales_vehicles(deleted_at);

create index if not exists sales_loans_contract_id_idx on public.sales_loans(contract_id);
create index if not exists sales_loans_finance_company_idx on public.sales_loans(finance_company);
create index if not exists sales_loans_deleted_at_idx on public.sales_loans(deleted_at);

create index if not exists sales_leases_contract_id_idx on public.sales_leases(contract_id);
create index if not exists sales_leases_lease_company_idx on public.sales_leases(lease_company);
create index if not exists sales_leases_deleted_at_idx on public.sales_leases(deleted_at);

create index if not exists sales_guarantors_contract_id_idx on public.sales_guarantors(contract_id);
create index if not exists sales_documents_contract_id_idx on public.sales_documents(contract_id);
create index if not exists sales_contact_histories_contract_id_idx on public.sales_contact_histories(contract_id);
create index if not exists sales_contact_histories_customer_id_idx on public.sales_contact_histories(customer_id);
create index if not exists sales_contact_histories_handled_at_idx on public.sales_contact_histories(handled_at desc);
create index if not exists sales_audit_logs_target_idx on public.sales_audit_logs(target_table, target_id);
create index if not exists sales_audit_logs_actor_idx on public.sales_audit_logs(actor_profile_id);
create unique index if not exists sales_lease_maturities_active_lease_id_uidx on public.sales_lease_maturities(lease_id) where deleted_at is null;
create index if not exists sales_lease_maturities_contract_id_idx on public.sales_lease_maturities(contract_id);
create index if not exists sales_lease_maturities_lease_id_idx on public.sales_lease_maturities(lease_id);
create index if not exists sales_lease_maturities_renewal_contract_id_idx on public.sales_lease_maturities(renewal_contract_id);
create index if not exists sales_lease_maturities_maturity_date_idx on public.sales_lease_maturities(maturity_date);
create index if not exists sales_lease_maturities_maturity_status_idx on public.sales_lease_maturities(maturity_status);
create index if not exists sales_lease_maturities_customer_choice_idx on public.sales_lease_maturities(customer_choice);
create index if not exists sales_lease_maturities_next_contact_date_idx on public.sales_lease_maturities(next_contact_date);
create index if not exists sales_lease_maturities_deleted_at_idx on public.sales_lease_maturities(deleted_at);
create index if not exists sales_lease_maturity_histories_maturity_id_idx on public.sales_lease_maturity_histories(maturity_id);
create index if not exists sales_lease_maturity_histories_contract_id_idx on public.sales_lease_maturity_histories(contract_id);
create index if not exists sales_lease_maturity_histories_customer_id_idx on public.sales_lease_maturity_histories(customer_id);
create index if not exists sales_lease_maturity_histories_handled_at_idx on public.sales_lease_maturity_histories(handled_at desc);
create index if not exists sales_lease_maturity_histories_next_action_date_idx on public.sales_lease_maturity_histories(next_action_date);
create index if not exists sales_lease_maturity_histories_deleted_at_idx on public.sales_lease_maturity_histories(deleted_at);

alter table public.sales_customers enable row level security;
alter table public.sales_contracts enable row level security;
alter table public.sales_vehicles enable row level security;
alter table public.sales_loans enable row level security;
alter table public.sales_leases enable row level security;
alter table public.sales_guarantors enable row level security;
alter table public.sales_documents enable row level security;
alter table public.sales_contact_histories enable row level security;
alter table public.sales_audit_logs enable row level security;
alter table public.sales_lease_maturities enable row level security;
alter table public.sales_lease_maturity_histories enable row level security;

revoke all on table public.sales_customers from public, anon, authenticated, service_role;
revoke all on table public.sales_contracts from public, anon, authenticated, service_role;
revoke all on table public.sales_vehicles from public, anon, authenticated, service_role;
revoke all on table public.sales_loans from public, anon, authenticated, service_role;
revoke all on table public.sales_leases from public, anon, authenticated, service_role;
revoke all on table public.sales_guarantors from public, anon, authenticated, service_role;
revoke all on table public.sales_documents from public, anon, authenticated, service_role;
revoke all on table public.sales_contact_histories from public, anon, authenticated, service_role;
revoke all on table public.sales_audit_logs from public, anon, authenticated, service_role;
revoke all on table public.sales_lease_maturities from public, anon, authenticated, service_role;
revoke all on table public.sales_lease_maturity_histories from public, anon, authenticated, service_role;

grant select, insert, update on public.sales_customers to authenticated;
grant select, insert, update on public.sales_contracts to authenticated;
grant select, insert, update on public.sales_vehicles to authenticated;
grant select, insert, update on public.sales_loans to authenticated;
grant select, insert, update on public.sales_leases to authenticated;
grant select, insert, update on public.sales_guarantors to authenticated;
grant select, insert, update on public.sales_documents to authenticated;
grant select, insert, update on public.sales_contact_histories to authenticated;
grant select, insert on public.sales_audit_logs to authenticated;
grant select, insert, update on public.sales_lease_maturities to authenticated;
grant select, insert, update on public.sales_lease_maturity_histories to authenticated;

grant select, insert, update, delete on public.sales_customers to service_role;
grant select, insert, update, delete on public.sales_contracts to service_role;
grant select, insert, update, delete on public.sales_vehicles to service_role;
grant select, insert, update, delete on public.sales_loans to service_role;
grant select, insert, update, delete on public.sales_leases to service_role;
grant select, insert, update, delete on public.sales_guarantors to service_role;
grant select, insert, update, delete on public.sales_documents to service_role;
grant select, insert, update, delete on public.sales_contact_histories to service_role;
grant select, insert, update, delete on public.sales_audit_logs to service_role;
grant select, insert, update, delete on public.sales_lease_maturities to service_role;
grant select, insert, update, delete on public.sales_lease_maturity_histories to service_role;

create or replace function public.sales_is_admin()
returns boolean
language sql
security definer
set search_path = ''
set row_security = off
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.sales_is_admin() from public, anon, authenticated, service_role;
grant execute on function public.sales_is_admin() to authenticated, service_role;

drop policy if exists "admins manage sales_customers" on public.sales_customers;
create policy "admins manage sales_customers"
on public.sales_customers for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_contracts" on public.sales_contracts;
create policy "admins manage sales_contracts"
on public.sales_contracts for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_vehicles" on public.sales_vehicles;
create policy "admins manage sales_vehicles"
on public.sales_vehicles for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_loans" on public.sales_loans;
create policy "admins manage sales_loans"
on public.sales_loans for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_leases" on public.sales_leases;
create policy "admins manage sales_leases"
on public.sales_leases for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_guarantors" on public.sales_guarantors;
create policy "admins manage sales_guarantors"
on public.sales_guarantors for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_documents" on public.sales_documents;
create policy "admins manage sales_documents"
on public.sales_documents for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_contact_histories" on public.sales_contact_histories;
create policy "admins manage sales_contact_histories"
on public.sales_contact_histories for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_audit_logs" on public.sales_audit_logs;
create policy "admins manage sales_audit_logs"
on public.sales_audit_logs for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_lease_maturities" on public.sales_lease_maturities;
create policy "admins manage sales_lease_maturities"
on public.sales_lease_maturities for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

drop policy if exists "admins manage sales_lease_maturity_histories" on public.sales_lease_maturity_histories;
create policy "admins manage sales_lease_maturity_histories"
on public.sales_lease_maturity_histories for all
to authenticated
using (public.sales_is_admin())
with check (public.sales_is_admin());

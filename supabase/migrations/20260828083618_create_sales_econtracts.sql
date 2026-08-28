-- Two-stage e-contract evidence store for approved sales loan customers.
-- Additive only: existing sales_* rows and sales_contracts.status are unchanged.

create table public.sales_econtracts (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.sales_contracts(id) on delete restrict,
  customer_id uuid not null references public.sales_customers(id) on delete restrict,
  loan_id uuid not null references public.sales_loans(id) on delete restrict,
  loan_application_number_snapshot text,
  contract_kind text not null check (contract_kind in ('purchase_intent', 'vehicle_confirmation')),
  revision integer not null check (revision > 0),
  management_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'opened', 'verified', 'signed', 'cancelled')),
  document_title text not null,
  document_version text not null,
  document_html_snapshot text not null,
  document_text_snapshot text not null,
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  customer_snapshot jsonb not null,
  terms_snapshot jsonb not null default '{}'::jsonb,
  important_items_snapshot jsonb not null,
  consent_snapshot jsonb,
  signature_snapshot jsonb,
  evidence_hash text check (evidence_hash is null or evidence_hash ~ '^[0-9a-f]{64}$'),
  link_token_hash text not null unique check (link_token_hash ~ '^[0-9a-f]{64}$'),
  link_expires_at timestamptz not null,
  delivery_revision integer not null default 1 check (delivery_revision > 0),
  delivery_method text not null default 'email' check (delivery_method in ('email')),
  delivery_destination_masked text not null,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  sent_by_profile_id uuid references public.profiles(id) on delete set null,
  sent_at timestamptz,
  opened_at timestamptz,
  identity_confirmed_at timestamptz,
  verified_at timestamptz,
  signed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  signer_ip inet,
  signer_user_agent text,
  signer_device_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, contract_kind, revision),
  check ((status = 'signed') = (signed_at is not null)),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (signed_at is null or verified_at is not null),
  check (verified_at is null or identity_confirmed_at is not null)
);

create table public.sales_econtract_access_sessions (
  id uuid primary key default gen_random_uuid(),
  econtract_id uuid not null references public.sales_econtracts(id) on delete restrict,
  delivery_revision integer not null check (delivery_revision > 0),
  session_token_hash text not null unique check (session_token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  identity_confirmed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_econtract_verifications (
  id uuid primary key default gen_random_uuid(),
  econtract_id uuid not null references public.sales_econtracts(id) on delete restrict,
  access_session_id uuid not null references public.sales_econtract_access_sessions(id) on delete restrict,
  delivery_revision integer not null check (delivery_revision > 0),
  method text not null default 'email_otp' check (method in ('email_otp')),
  destination_masked text not null,
  otp_hash text not null check (otp_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  sent_at timestamptz not null default now(),
  resend_available_at timestamptz not null,
  rate_window_started_at timestamptz not null default now(),
  resend_count integer not null default 1 check (resend_count between 1 and 10),
  verified_at timestamptz,
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales_econtract_events (
  id uuid primary key default gen_random_uuid(),
  econtract_id uuid not null references public.sales_econtracts(id) on delete restrict,
  event_type text not null,
  actor_kind text not null check (actor_kind in ('admin', 'customer', 'system')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  ip_address inet,
  user_agent text,
  device_json jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index sales_econtracts_contract_id_idx on public.sales_econtracts(contract_id, contract_kind, revision desc);
create index sales_econtracts_customer_id_idx on public.sales_econtracts(customer_id, created_at desc);
create index sales_econtracts_loan_id_idx on public.sales_econtracts(loan_id, created_at desc);
create index sales_econtracts_status_idx on public.sales_econtracts(status, updated_at desc);
create index sales_econtracts_link_expires_at_idx on public.sales_econtracts(link_expires_at);
create index sales_econtracts_created_by_profile_idx
  on public.sales_econtracts(created_by_profile_id)
  where created_by_profile_id is not null;
create index sales_econtracts_sent_by_profile_idx
  on public.sales_econtracts(sent_by_profile_id)
  where sent_by_profile_id is not null;
create unique index sales_econtracts_one_active_kind_uidx
  on public.sales_econtracts(contract_id, contract_kind)
  where status in ('draft', 'sent', 'opened', 'verified');
create index sales_econtract_access_sessions_contract_idx
  on public.sales_econtract_access_sessions(econtract_id, delivery_revision, expires_at desc);
create index sales_econtract_verifications_contract_idx
  on public.sales_econtract_verifications(econtract_id, delivery_revision, created_at desc);
create index sales_econtract_verifications_access_session_idx
  on public.sales_econtract_verifications(access_session_id, created_at desc);
create unique index sales_econtract_one_pending_verification_uidx
  on public.sales_econtract_verifications(access_session_id)
  where verified_at is null and invalidated_at is null;
create index sales_econtract_events_contract_idx
  on public.sales_econtract_events(econtract_id, created_at asc);
create index sales_econtract_events_actor_profile_idx
  on public.sales_econtract_events(actor_profile_id)
  where actor_profile_id is not null;

create or replace function public.sales_econtract_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create trigger sales_econtracts_set_updated_at
before update on public.sales_econtracts
for each row execute function public.sales_econtract_set_updated_at();

create trigger sales_econtract_access_sessions_set_updated_at
before update on public.sales_econtract_access_sessions
for each row execute function public.sales_econtract_set_updated_at();

create trigger sales_econtract_verifications_set_updated_at
before update on public.sales_econtract_verifications
for each row execute function public.sales_econtract_set_updated_at();

create or replace function public.sales_econtract_protect_immutable()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'sales e-contract evidence cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.signed_at is not null then
    raise exception 'signed sales e-contract evidence is immutable';
  end if;

  if (
    new.contract_id is distinct from old.contract_id or
    new.customer_id is distinct from old.customer_id or
    new.loan_id is distinct from old.loan_id or
    new.loan_application_number_snapshot is distinct from old.loan_application_number_snapshot or
    new.contract_kind is distinct from old.contract_kind or
    new.revision is distinct from old.revision or
    new.management_number is distinct from old.management_number or
    new.document_title is distinct from old.document_title or
    new.document_version is distinct from old.document_version or
    new.document_html_snapshot is distinct from old.document_html_snapshot or
    new.document_text_snapshot is distinct from old.document_text_snapshot or
    new.document_hash is distinct from old.document_hash or
    new.customer_snapshot is distinct from old.customer_snapshot or
    new.terms_snapshot is distinct from old.terms_snapshot or
    new.important_items_snapshot is distinct from old.important_items_snapshot
  ) then
    raise exception 'issued sales e-contract snapshots are immutable';
  end if;

  return new;
end;
$$;

create trigger sales_econtracts_protect_immutable
before update or delete on public.sales_econtracts
for each row execute function public.sales_econtract_protect_immutable();

create or replace function public.sales_econtract_verifications_protect_evidence()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'sales e-contract verification evidence cannot be deleted';
  end if;

  if tg_op = 'UPDATE' and old.verified_at is not null then
    raise exception 'verified sales e-contract verification evidence is immutable';
  end if;

  return new;
end;
$$;

create trigger sales_econtract_verifications_protect_evidence
before update or delete on public.sales_econtract_verifications
for each row execute function public.sales_econtract_verifications_protect_evidence();

create or replace function public.sales_econtract_complete_otp_verification(
  p_econtract_id uuid,
  p_access_session_id uuid,
  p_verification_id uuid,
  p_expected_attempt_count integer,
  p_verified_at timestamptz
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  affected_rows integer;
begin
  update public.sales_econtract_verifications
  set verified_at = p_verified_at
  where id = p_verification_id
    and econtract_id = p_econtract_id
    and access_session_id = p_access_session_id
    and delivery_revision = (
      select e.delivery_revision
      from public.sales_econtracts e
      where e.id = p_econtract_id
    )
    and verified_at is null
    and invalidated_at is null
    and expires_at > p_verified_at
    and attempt_count = p_expected_attempt_count
    and attempt_count < max_attempts;
  get diagnostics affected_rows = row_count;
  if affected_rows <> 1 then
    return false;
  end if;

  if not exists (
    select 1
    from public.sales_econtract_access_sessions s
    where s.id = p_access_session_id
      and s.econtract_id = p_econtract_id
      and s.delivery_revision = (
        select e.delivery_revision from public.sales_econtracts e where e.id = p_econtract_id
      )
      and s.revoked_at is null
      and s.expires_at > p_verified_at
  ) then
    raise exception 'sales e-contract access session is unavailable';
  end if;

  if not exists (select 1 from public.sales_econtracts where id = p_econtract_id and status = 'signed') then
    update public.sales_econtracts
    set status = 'verified', verified_at = p_verified_at
    where id = p_econtract_id
      and status in ('sent', 'opened', 'verified')
      and signed_at is null
      and cancelled_at is null;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 1 then
      raise exception 'sales e-contract cannot transition to verified';
    end if;
  end if;

  return true;
end;
$$;

create or replace function public.sales_econtract_events_append_only()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  raise exception 'sales e-contract events are append-only';
end;
$$;

create trigger sales_econtract_events_append_only
before update or delete on public.sales_econtract_events
for each row execute function public.sales_econtract_events_append_only();

alter table public.sales_econtracts enable row level security;
alter table public.sales_econtracts force row level security;
alter table public.sales_econtract_access_sessions enable row level security;
alter table public.sales_econtract_access_sessions force row level security;
alter table public.sales_econtract_verifications enable row level security;
alter table public.sales_econtract_verifications force row level security;
alter table public.sales_econtract_events enable row level security;
alter table public.sales_econtract_events force row level security;

revoke all on table public.sales_econtracts from public, anon, authenticated, service_role;
revoke all on table public.sales_econtract_access_sessions from public, anon, authenticated, service_role;
revoke all on table public.sales_econtract_verifications from public, anon, authenticated, service_role;
revoke all on table public.sales_econtract_events from public, anon, authenticated, service_role;

grant select, insert, update on table public.sales_econtracts to service_role;
grant select, insert, update, delete on table public.sales_econtract_access_sessions to service_role;
grant select, insert, update on table public.sales_econtract_verifications to service_role;
grant select, insert on table public.sales_econtract_events to service_role;

revoke all on function public.sales_econtract_set_updated_at() from public, anon, authenticated;
revoke all on function public.sales_econtract_protect_immutable() from public, anon, authenticated;
revoke all on function public.sales_econtract_verifications_protect_evidence() from public, anon, authenticated;
revoke all on function public.sales_econtract_complete_otp_verification(uuid, uuid, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.sales_econtract_events_append_only() from public, anon, authenticated;
grant execute on function public.sales_econtract_set_updated_at() to service_role;
grant execute on function public.sales_econtract_protect_immutable() to service_role;
grant execute on function public.sales_econtract_verifications_protect_evidence() to service_role;
grant execute on function public.sales_econtract_complete_otp_verification(uuid, uuid, uuid, integer, timestamptz) to service_role;
grant execute on function public.sales_econtract_events_append_only() to service_role;

comment on table public.sales_econtracts is 'Immutable issued and signed snapshots for the two-stage sales e-contract flow.';
comment on table public.sales_econtract_access_sessions is 'Short-lived, hashed-token customer identity access sessions.';
comment on table public.sales_econtract_verifications is 'Hashed email OTP challenges with attempt and resend limits.';
comment on table public.sales_econtract_events is 'Append-only e-contract audit event stream.';

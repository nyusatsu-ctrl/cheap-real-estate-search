-- Run after 20260828083618_create_sales_econtracts.sql in an isolated database.
-- Raises an exception if RLS, grants, uniqueness, append-only events or immutable
-- issued/signed snapshots do not behave as designed.

do $$
declare
  target text;
begin
  foreach target in array array[
    'sales_econtracts',
    'sales_econtract_access_sessions',
    'sales_econtract_verifications',
    'sales_econtract_events'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target
        and c.relrowsecurity
        and c.relforcerowsecurity
    ) then
      raise exception 'RLS or FORCE RLS is missing on %', target;
    end if;

    if pg_catalog.has_table_privilege('anon', format('public.%I', target), 'SELECT')
      or pg_catalog.has_table_privilege('authenticated', format('public.%I', target), 'SELECT') then
      raise exception 'browser role unexpectedly has SELECT on %', target;
    end if;
  end loop;

  if pg_catalog.has_table_privilege('service_role', 'public.sales_econtracts', 'DELETE, TRUNCATE, REFERENCES, TRIGGER')
    or pg_catalog.has_table_privilege('service_role', 'public.sales_econtract_access_sessions', 'TRUNCATE, REFERENCES, TRIGGER')
    or pg_catalog.has_table_privilege('service_role', 'public.sales_econtract_verifications', 'DELETE, TRUNCATE, REFERENCES, TRIGGER')
    or pg_catalog.has_table_privilege('service_role', 'public.sales_econtract_events', 'UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') then
    raise exception 'service_role has an unexpected evidence privilege';
  end if;
end;
$$;

insert into public.sales_customers (id, name)
values ('00000000-0000-0000-0000-000000000002', '検証 顧客');

insert into public.sales_contracts (id, customer_id, vehicle_type, contract_type)
values (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'car',
  'loan'
);

insert into public.sales_loans (id, contract_id, finance_company, application_number)
values ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003', 'premium', 'VERIFY-APPLICATION');

insert into public.sales_econtracts (
  id,
  contract_id,
  customer_id,
  loan_id,
  loan_application_number_snapshot,
  contract_kind,
  revision,
  management_number,
  status,
  document_title,
  document_version,
  document_html_snapshot,
  document_text_snapshot,
  document_hash,
  customer_snapshot,
  terms_snapshot,
  important_items_snapshot,
  link_token_hash,
  link_expires_at,
  delivery_destination_masked,
  sent_at,
  opened_at,
  identity_confirmed_at,
  verified_at
) values (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000007',
  'VERIFY-APPLICATION',
  'purchase_intent',
  1,
  'EL-VERIFY-P1-0001',
  'opened',
  '検証契約',
  'verify-v1',
  '<p>immutable</p>',
  'immutable',
  repeat('a', 64),
  '{"name":"検証 顧客","email":"test@example.test"}'::jsonb,
  '{}'::jsonb,
  '[{"id":"consent","text":"確認"}]'::jsonb,
  repeat('b', 64),
  now() + interval '14 days',
  'te**@example.test',
  now(),
  now(),
  now(),
  null
);

do $$
begin
  begin
    update public.sales_econtracts
    set document_text_snapshot = 'tampered'
    where id = '00000000-0000-0000-0000-000000000004';
    raise exception 'issued snapshot update unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'issued snapshot update unexpectedly succeeded' then raise; end if;
  end;

  begin
    insert into public.sales_econtracts (
      contract_id, customer_id, loan_id, loan_application_number_snapshot,
      contract_kind, revision, management_number,
      status, document_title, document_version, document_html_snapshot,
      document_text_snapshot, document_hash, customer_snapshot,
      important_items_snapshot, link_token_hash, link_expires_at,
      delivery_destination_masked
    ) values (
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000007', 'VERIFY-APPLICATION',
      'purchase_intent', 2, 'EL-VERIFY-P1-0002', 'sent', 'duplicate', 'v2',
      '<p>duplicate</p>', 'duplicate', repeat('c', 64), '{}'::jsonb,
      '[]'::jsonb, repeat('d', 64), now() + interval '14 days', 'te**@example.test'
    );
    raise exception 'second active contract unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;
end;
$$;

insert into public.sales_econtract_events (
  id, econtract_id, event_type, actor_kind
) values (
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000004',
  'verified',
  'customer'
);

insert into public.sales_econtract_access_sessions (
  id, econtract_id, delivery_revision, session_token_hash, expires_at
) values (
  '00000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000004',
  1,
  repeat('9', 64),
  now() + interval '30 minutes'
);

insert into public.sales_econtract_access_sessions (
  id, econtract_id, delivery_revision, session_token_hash, expires_at
) values (
  '00000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000004',
  1,
  repeat('8', 64),
  now() + interval '30 minutes'
);

insert into public.sales_econtract_verifications (
  id, econtract_id, access_session_id, delivery_revision, destination_masked, otp_hash, expires_at,
  resend_available_at
) values (
  '00000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000008',
  1,
  'te**@example.test',
  repeat('f', 64),
  now() + interval '10 minutes',
  now() + interval '1 minute'
);

do $$
declare
  completed boolean;
begin
  select public.sales_econtract_complete_otp_verification(
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000006',
    0,
    now()
  ) into completed;
  if completed then
    raise exception 'OTP verification accepted a different access session';
  end if;

  select public.sales_econtract_complete_otp_verification(
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000006',
    0,
    now()
  ) into completed;
  if not completed then
    raise exception 'atomic OTP verification unexpectedly failed';
  end if;
end;
$$;

update public.sales_econtracts
set
  status = 'signed',
  signed_at = now(),
  consent_snapshot = '{"confirmedAt":"2026-08-28T00:00:00Z","items":[{"id":"consent","text":"確認","agreed":true}]}'::jsonb,
  signature_snapshot = '{"method":"email_otp"}'::jsonb,
  evidence_hash = repeat('e', 64),
  signer_ip = '127.0.0.1',
  signer_user_agent = 'migration-verifier',
  signer_device_json = '{"platform":"test"}'::jsonb
where id = '00000000-0000-0000-0000-000000000004';

do $$
begin
  begin
    update public.sales_econtracts
    set cancelled_reason = 'tampered after signature'
    where id = '00000000-0000-0000-0000-000000000004';
    raise exception 'signed contract update unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'signed contract update unexpectedly succeeded' then raise; end if;
  end;

  begin
    delete from public.sales_econtract_events
    where id = '00000000-0000-0000-0000-000000000005';
    raise exception 'event delete unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'event delete unexpectedly succeeded' then raise; end if;
  end;

  begin
    update public.sales_econtract_verifications
    set attempt_count = 1
    where id = '00000000-0000-0000-0000-000000000006';
    raise exception 'verified OTP evidence update unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'verified OTP evidence update unexpectedly succeeded' then raise; end if;
  end;

  begin
    delete from public.sales_econtract_verifications
    where id = '00000000-0000-0000-0000-000000000006';
    raise exception 'verified OTP evidence delete unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'verified OTP evidence delete unexpectedly succeeded' then raise; end if;
  end;

  if not exists (
    select 1 from public.sales_econtracts
    where id = '00000000-0000-0000-0000-000000000004'
      and status = 'signed'
      and evidence_hash = repeat('e', 64)
  ) then
    raise exception 'signed evidence was not persisted';
  end if;
end;
$$;

select 'sales e-contract migration verification passed' as result;

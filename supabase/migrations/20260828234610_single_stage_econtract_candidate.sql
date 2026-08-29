do $$
begin
  if exists (
    select 1
    from public.sales_contracts
    where source_system = 'gas_loan_review'
      and source_row_key is not null
      and deleted_at is null
    group by source_row_key
    having count(*) > 1
  ) then
    raise exception 'duplicate active gas_loan_review source_row_key values must be resolved before migration';
  end if;

  if exists (
    select 1
    from public.sales_contracts
    where source_system = 'gas_loan_review'
      and source_row_number is not null
      and deleted_at is null
    group by source_row_number
    having count(*) > 1
  ) then
    raise exception 'duplicate active gas_loan_review source_row_number values must be resolved before migration';
  end if;
end;
$$;

create unique index sales_contracts_gas_source_row_key_active_uidx
  on public.sales_contracts(source_row_key)
  where source_system = 'gas_loan_review'
    and source_row_key is not null
    and deleted_at is null;

create unique index sales_contracts_gas_source_row_number_active_uidx
  on public.sales_contracts(source_row_number)
  where source_system = 'gas_loan_review'
    and source_row_number is not null
    and deleted_at is null;

create or replace function public.upsert_sales_econtract_candidate(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_source_row_key text := btrim(coalesce(p_payload ->> 'sourceRowKey', ''));
  v_source_row_number integer;
  v_application_number text := btrim(coalesce(p_payload ->> 'applicationNumber', ''));
  v_customer_name text := btrim(coalesce(p_payload ->> 'customerName', ''));
  v_customer_kana text := nullif(btrim(coalesce(p_payload ->> 'customerKana', '')), '');
  v_phone text := nullif(btrim(coalesce(p_payload ->> 'phone', '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_payload ->> 'email', ''))), '');
  v_address text := nullif(btrim(coalesce(p_payload ->> 'address', '')), '');
  v_vehicle_type text := btrim(coalesce(p_payload ->> 'vehicleType', ''));
  v_desired_vehicle text := nullif(btrim(coalesce(p_payload ->> 'desiredVehicle', '')), '');
  v_finance_company text := btrim(coalesce(p_payload ->> 'financeCompany', ''));
  v_received_at timestamptz;
  v_existing_contract_id uuid;
  v_customer_id uuid;
  v_contract_id uuid;
begin
  if p_payload ->> 'sourceSystem' is distinct from 'gas_loan_review'
    or p_payload ->> 'contractType' is distinct from 'loan'
    or p_payload ->> 'approvalStatus' is distinct from 'approved'
    or v_finance_company not in ('premium', 'ast')
    or v_vehicle_type not in ('car', 'bike')
    or v_source_row_key = ''
    or char_length(v_source_row_key) > 500
    or v_application_number = ''
    or char_length(v_application_number) > 500
    or v_customer_name = ''
    or char_length(v_customer_name) > 200
  then
    raise exception 'ineligible or invalid e-contract candidate payload';
  end if;

  begin
    v_source_row_number := (p_payload ->> 'sourceRowNumber')::integer;
  exception when others then
    raise exception 'invalid source row number';
  end;
  if v_source_row_number < 2 or v_source_row_number > 10000000 then
    raise exception 'invalid source row number';
  end if;

  if p_payload ->> 'sourceReceivedAt' is not null then
    begin
      v_received_at := (p_payload ->> 'sourceReceivedAt')::timestamptz;
    exception when others then
      raise exception 'invalid source received timestamp';
    end;
  end if;

  if v_email is not null and (char_length(v_email) > 320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then
    raise exception 'invalid customer email';
  end if;
  if char_length(coalesce(v_customer_kana, '')) > 200
    or char_length(coalesce(v_phone, '')) > 100
    or char_length(coalesce(v_address, '')) > 1000
    or char_length(coalesce(v_desired_vehicle, '')) > 500
  then
    raise exception 'candidate field exceeds maximum length';
  end if;

  perform pg_advisory_xact_lock(least(
    hashtextextended('econtract-source:' || v_source_row_key, 0),
    hashtextextended('econtract-application:' || v_application_number, 0)
  ));
  perform pg_advisory_xact_lock(greatest(
    hashtextextended('econtract-source:' || v_source_row_key, 0),
    hashtextextended('econtract-application:' || v_application_number, 0)
  ));

  select sc.id
  into v_existing_contract_id
  from public.sales_contracts sc
  left join public.sales_loans sl
    on sl.contract_id = sc.id
    and sl.deleted_at is null
  where sc.source_system = 'gas_loan_review'
    and sc.deleted_at is null
    and (
      sc.source_row_key = v_source_row_key
      or sl.application_number = v_application_number
    )
  order by sc.created_at asc
  limit 1;

  if v_existing_contract_id is not null then
    return jsonb_build_object('contract_id', v_existing_contract_id, 'created', false);
  end if;

  insert into public.sales_customers (
    name, kana, phone, email, address
  ) values (
    v_customer_name, v_customer_kana, v_phone, v_email, v_address
  ) returning id into v_customer_id;

  insert into public.sales_contracts (
    customer_id,
    source_system,
    source_row_key,
    source_row_number,
    source_received_at,
    source_snapshot_json,
    vehicle_type,
    contract_type,
    status
  ) values (
    v_customer_id,
    'gas_loan_review',
    v_source_row_key,
    v_source_row_number,
    v_received_at,
    jsonb_build_object(
      'sourceSystem', 'gas_loan_review',
      'sourceRowKey', v_source_row_key,
      'sourceRowNumber', v_source_row_number,
      'sourceReceivedAt', v_received_at,
      'applicationNumber', v_application_number,
      'customerName', v_customer_name,
      'customerKana', v_customer_kana,
      'phone', v_phone,
      'email', v_email,
      'address', v_address,
      'vehicleType', v_vehicle_type,
      'desiredVehicle', v_desired_vehicle,
      'contractType', 'loan',
      'financeCompany', v_finance_company,
      'approvalStatus', 'approved'
    ),
    v_vehicle_type,
    'loan',
    'contract_candidate'
  ) returning id into v_contract_id;

  insert into public.sales_vehicles (
    contract_id, vehicle_type, model
  ) values (
    v_contract_id, v_vehicle_type, v_desired_vehicle
  );

  insert into public.sales_loans (
    contract_id, finance_company, application_number, approval_status
  ) values (
    v_contract_id, v_finance_company, v_application_number, 'approved'
  );

  insert into public.sales_audit_logs (
    target_table, target_id, action, before_json, after_json, memo
  ) values (
    'sales_contracts',
    v_contract_id,
    'econtract_candidate_sync',
    null,
    jsonb_build_object(
      'sourceSystem', 'gas_loan_review',
      'sourceRowKey', v_source_row_key,
      'applicationNumber', v_application_number,
      'financeCompany', v_finance_company,
      'approvalStatus', 'approved',
      'emailSent', false,
      'econtractCreated', false
    ),
    '元の自社ローン審査管理から電子契約候補を同期'
  );

  return jsonb_build_object('contract_id', v_contract_id, 'created', true);
end;
$$;

revoke all on function public.upsert_sales_econtract_candidate(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.upsert_sales_econtract_candidate(jsonb) to service_role;

comment on function public.upsert_sales_econtract_candidate(jsonb)
  is 'Atomically creates or returns one eligible e-contract candidate; it never issues an e-contract or sends email.';

comment on table public.sales_econtracts
  is 'Immutable issued and signed snapshots. New operations issue only purchase_intent; vehicle_confirmation is retained as historical evidence.';

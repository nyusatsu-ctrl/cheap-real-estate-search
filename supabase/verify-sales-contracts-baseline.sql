-- Run only in an isolated database after the sales contracts baseline migration.
-- All data changes are rolled back.

begin;

do $$
declare
  expected_tables constant text[] := array[
    'sales_customers',
    'sales_contracts',
    'sales_vehicles',
    'sales_loans',
    'sales_leases',
    'sales_guarantors',
    'sales_documents',
    'sales_contact_histories',
    'sales_audit_logs',
    'sales_lease_maturities',
    'sales_lease_maturity_histories'
  ];
  expected_indexes constant text[] := array[
    'sales_contracts_customer_id_idx',
    'sales_loans_contract_id_idx',
    'sales_leases_contract_id_idx',
    'sales_contact_histories_customer_id_idx',
    'sales_audit_logs_actor_idx',
    'sales_lease_maturities_active_lease_id_uidx',
    'sales_lease_maturities_renewal_contract_id_idx',
    'sales_lease_maturity_histories_maturity_id_idx',
    'sales_lease_maturity_histories_contract_id_idx',
    'sales_lease_maturity_histories_customer_id_idx'
  ];
  table_name text;
  index_name text;
  missing_columns integer;
begin
  foreach table_name in array expected_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception 'missing table: public.%', table_name;
    end if;

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = table_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on public.%', table_name;
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = 'admins manage ' || table_name
        and roles = array['authenticated']::name[]
        and cmd = 'ALL'
    ) then
      raise exception 'missing authenticated admin policy on public.%', table_name;
    end if;

    if has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
      or has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
      or has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
      or has_table_privilege('anon', format('public.%I', table_name), 'DELETE') then
      raise exception 'anon unexpectedly has DML privileges on public.%', table_name;
    end if;

    if not has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
      or not has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
      or has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE') then
      raise exception 'authenticated privileges are incorrect on public.%', table_name;
    end if;

    if table_name = 'sales_audit_logs' then
      if has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE') then
        raise exception 'authenticated must not update public.%', table_name;
      end if;
    elsif not has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE') then
      raise exception 'authenticated is missing UPDATE on public.%', table_name;
    end if;

    if not has_table_privilege('service_role', format('public.%I', table_name), 'SELECT')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'INSERT')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'UPDATE')
      or not has_table_privilege('service_role', format('public.%I', table_name), 'DELETE')
      or has_table_privilege('service_role', format('public.%I', table_name), 'TRUNCATE') then
      raise exception 'service_role privileges are incorrect on public.%', table_name;
    end if;
  end loop;

  foreach index_name in array expected_indexes loop
    if to_regclass(format('public.%I', index_name)) is null then
      raise exception 'missing index: public.%', index_name;
    end if;
  end loop;

  select count(*)
  into missing_columns
  from (values
    ('sales_loans', 'initial_payment_amount'),
    ('sales_loans', 'final_payment_amount'),
    ('sales_leases', 'initial_payment_amount'),
    ('sales_leases', 'final_payment_amount'),
    ('sales_lease_maturities', 'mileage_excess_km'),
    ('sales_lease_maturities', 'mileage_overage_rate_yen'),
    ('sales_lease_maturities', 'mileage_overage_amount'),
    ('sales_lease_maturities', 'condition_settlement_amount'),
    ('sales_lease_maturities', 'renewal_maintenance_fee_amount')
  ) as expected(table_name, column_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = expected.table_name
      and c.column_name = expected.column_name
  );

  if missing_columns <> 0 then
    raise exception '% expected upgrade columns are missing', missing_columns;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'sales_contracts'
      and c.conname = 'sales_contracts_status_check'
      and c.convalidated
      and pg_get_constraintdef(c.oid) like '%contract_candidate%'
      and pg_get_constraintdef(c.oid) like '%completed%'
  ) then
    raise exception 'sales_contracts_status_check is missing the complete status set';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'sales_is_admin'
      and p.prosecdef
      and p.provolatile = 's'
      and p.proconfig @> array['search_path=""', 'row_security=off']
  ) then
    raise exception 'sales_is_admin is not hardened as expected';
  end if;

  if not has_function_privilege('authenticated', 'public.sales_is_admin()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.sales_is_admin()', 'EXECUTE')
    or has_function_privilege('anon', 'public.sales_is_admin()', 'EXECUTE') then
    raise exception 'sales_is_admin EXECUTE privileges are incorrect';
  end if;
end
$$;

set local role service_role;

insert into public.sales_customers (id, name, email)
values ('10000000-0000-4000-8000-000000000001', 'Baseline Test Customer', 'baseline@example.invalid');

insert into public.sales_contracts (
  id, customer_id, vehicle_type, contract_type, status, total_price
)
values (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'car',
  'loan',
  'contract_candidate',
  1500000
);

insert into public.sales_vehicles (id, contract_id, vehicle_type, maker, model)
values (
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000002',
  'car',
  'Test Maker',
  'Test Model'
);

insert into public.sales_loans (
  id, contract_id, finance_company, approval_status, principal,
  initial_payment_amount, monthly_payment, final_payment_amount
)
values (
  '10000000-0000-4000-8000-000000000004',
  '10000000-0000-4000-8000-000000000002',
  'premium',
  'approved',
  1500000,
  50000,
  40000,
  30000
);

insert into public.sales_contracts (
  id, customer_id, vehicle_type, contract_type, status, total_price
)
values (
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  'car',
  'lease',
  'leasing',
  1800000
);

insert into public.sales_leases (
  id, contract_id, lease_company, lease_months,
  initial_payment_amount, monthly_lease_fee, final_payment_amount
)
values (
  '10000000-0000-4000-8000-000000000006',
  '10000000-0000-4000-8000-000000000005',
  'premium',
  36,
  50000,
  45000,
  300000
);

insert into public.sales_guarantors (id, contract_id, name)
values (
  '10000000-0000-4000-8000-000000000007',
  '10000000-0000-4000-8000-000000000002',
  'Baseline Guarantor'
);

insert into public.sales_documents (id, contract_id, document_type, title)
values (
  '10000000-0000-4000-8000-000000000008',
  '10000000-0000-4000-8000-000000000002',
  'test',
  'Baseline Test Document'
);

insert into public.sales_contact_histories (id, contract_id, customer_id, content)
values (
  '10000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  'Baseline contact history'
);

insert into public.sales_audit_logs (id, target_table, target_id, action)
values (
  '10000000-0000-4000-8000-000000000010',
  'sales_contracts',
  '10000000-0000-4000-8000-000000000002',
  'baseline_test'
);

insert into public.sales_lease_maturities (
  id, contract_id, lease_id, maturity_status, customer_choice,
  mileage_excess_km, mileage_overage_rate_yen, mileage_overage_amount,
  condition_settlement_amount, renewal_maintenance_fee_amount
)
values (
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000006',
  'notified',
  'undecided',
  100,
  10,
  1000,
  2000,
  3000
);

insert into public.sales_lease_maturity_histories (
  id, maturity_id, contract_id, customer_id, content
)
values (
  '10000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000011',
  '10000000-0000-4000-8000-000000000005',
  '10000000-0000-4000-8000-000000000001',
  'Baseline maturity history'
);

update public.sales_contracts
set status = 'completed'
where id = '10000000-0000-4000-8000-000000000002';

reset role;

do $$
begin
  if (select count(*) from public.sales_customers where id = '10000000-0000-4000-8000-000000000001') <> 1
    or (select status from public.sales_contracts where id = '10000000-0000-4000-8000-000000000002') <> 'completed'
    or (select count(*) from public.sales_lease_maturities where id = '10000000-0000-4000-8000-000000000011') <> 1 then
    raise exception 'baseline DML verification failed';
  end if;
end
$$;

rollback;

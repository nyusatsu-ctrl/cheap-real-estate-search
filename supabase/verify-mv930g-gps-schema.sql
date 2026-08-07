-- Read-only post-application verification for the MV930G GPS migration.
-- Compare public_non_gps_schema_fingerprint with the preflight result.

begin;
set transaction read only;

with expected(object_name, expected_relkind) as (
  values
    ('gps_customers', 'r'::"char"),
    ('gps_vehicles', 'r'::"char"),
    ('gps_devices', 'r'::"char"),
    ('gps_positions', 'r'::"char"),
    ('raw_device_logs', 'r'::"char"),
    ('protocol_parse_errors', 'r'::"char"),
    ('operation_logs', 'r'::"char"),
    ('device_command_queue', 'r'::"char"),
    ('gps_ingest_nonces', 'r'::"char"),
    ('gps_latest_positions', 'v'::"char")
)
select
  e.object_name,
  e.expected_relkind,
  c.relkind as actual_relkind,
  c.relkind = e.expected_relkind as object_ok
from expected e
left join pg_catalog.pg_class c
  on c.relname = e.object_name
 and c.relnamespace = 'public'::pg_catalog.regnamespace
order by e.object_name;

select
  c.relname as object_name,
  a.attnum as ordinal_position,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
  not a.attnotnull as is_nullable,
  pg_catalog.pg_get_expr(d.adbin, d.adrelid) as column_default
from pg_catalog.pg_class c
join pg_catalog.pg_attribute a on a.attrelid = c.oid
left join pg_catalog.pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
where c.relnamespace = 'public'::pg_catalog.regnamespace
  and c.relname in (
    'gps_customers',
    'gps_vehicles',
    'gps_devices',
    'gps_positions',
    'raw_device_logs',
    'protocol_parse_errors',
    'operation_logs',
    'device_command_queue',
    'gps_ingest_nonces',
    'gps_latest_positions'
  )
  and a.attnum > 0
  and not a.attisdropped
order by c.relname, a.attnum;

select
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid, true) as constraint_definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
where c.relnamespace = 'public'::pg_catalog.regnamespace
  and c.relname in (
    'gps_customers',
    'gps_vehicles',
    'gps_devices',
    'gps_positions',
    'raw_device_logs',
    'protocol_parse_errors',
    'operation_logs',
    'device_command_queue',
    'gps_ingest_nonces'
  )
order by c.relname, con.contype, con.conname;

select
  t.relname as table_name,
  i.relname as index_name,
  x.indisunique as is_unique,
  x.indisprimary as is_primary,
  pg_catalog.pg_get_indexdef(i.oid) as index_definition
from pg_catalog.pg_index x
join pg_catalog.pg_class t on t.oid = x.indrelid
join pg_catalog.pg_class i on i.oid = x.indexrelid
where t.relnamespace = 'public'::pg_catalog.regnamespace
  and t.relname in (
    'gps_customers',
    'gps_vehicles',
    'gps_devices',
    'gps_positions',
    'raw_device_logs',
    'protocol_parse_errors',
    'operation_logs',
    'device_command_queue',
    'gps_ingest_nonces'
  )
order by t.relname, i.relname;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  pg_catalog.count(p.policyname) as policy_count,
  c.relrowsecurity
    and c.relforcerowsecurity
    and pg_catalog.count(p.policyname) = 0 as default_deny_ok
from pg_catalog.pg_class c
left join pg_catalog.pg_policies p
  on p.schemaname = 'public'
 and p.tablename = c.relname
where c.relnamespace = 'public'::pg_catalog.regnamespace
  and c.relname in (
    'gps_customers',
    'gps_vehicles',
    'gps_devices',
    'gps_positions',
    'raw_device_logs',
    'protocol_parse_errors',
    'operation_logs',
    'device_command_queue',
    'gps_ingest_nonces'
  )
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;

with objects(object_name, object_kind) as (
  values
    ('gps_customers', 'table'),
    ('gps_vehicles', 'table'),
    ('gps_devices', 'table'),
    ('gps_positions', 'table'),
    ('raw_device_logs', 'table'),
    ('protocol_parse_errors', 'table'),
    ('operation_logs', 'table'),
    ('device_command_queue', 'table'),
    ('gps_ingest_nonces', 'table'),
    ('gps_latest_positions', 'view')
),
roles(role_name) as (
  values ('anon'), ('authenticated'), ('service_role')
)
select
  o.object_name,
  o.object_kind,
  r.role_name,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'SELECT') as can_select,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'INSERT') as can_insert,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'UPDATE') as can_update,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'DELETE') as can_delete,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRUNCATE') as can_truncate,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'REFERENCES') as can_reference,
  pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRIGGER') as can_trigger,
  case
    when r.role_name in ('anon', 'authenticated') then
      not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'SELECT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'INSERT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'UPDATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'DELETE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRUNCATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'REFERENCES')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRIGGER')
    when o.object_name = 'gps_ingest_nonces' then
      not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'SELECT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'INSERT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'UPDATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'DELETE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRUNCATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'REFERENCES')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'TRIGGER')
    when o.object_kind = 'table' then
      pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'SELECT')
      and pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'INSERT')
      and pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'UPDATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'DELETE')
    else
      pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'SELECT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'INSERT')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'UPDATE')
      and not pg_catalog.has_table_privilege(r.role_name, 'public.' || o.object_name, 'DELETE')
  end as permission_ok
from objects o
cross join roles r
order by o.object_name, r.role_name;

select
  c.relname as view_name,
  c.reloptions,
  pg_catalog.pg_get_viewdef(c.oid, true) as view_definition,
  c.reloptions @> array['security_invoker=true'] as security_invoker_ok,
  c.reloptions @> array['security_barrier=true'] as security_barrier_ok
from pg_catalog.pg_class c
where c.relnamespace = 'public'::pg_catalog.regnamespace
  and c.relname = 'gps_latest_positions'
  and c.relkind = 'v';

select
  c.relname as table_name,
  con.conname as safety_constraint,
  pg_catalog.pg_get_constraintdef(con.oid, true) as constraint_definition
from pg_catalog.pg_constraint con
join pg_catalog.pg_class c on c.oid = con.conrelid
where c.relnamespace = 'public'::pg_catalog.regnamespace
  and c.relname in ('operation_logs', 'device_command_queue')
  and con.conname in (
    'operation_logs_phase1_disabled_check',
    'device_command_queue_command_type_check',
    'device_command_queue_command_payload_check',
    'device_command_queue_phase1_disabled_check'
  )
order by c.relname, con.conname;

select
  pg_catalog.has_function_privilege(
    'anon',
    'public.mv930g_gps_set_updated_at()',
    'EXECUTE'
  ) as anon_can_execute_trigger_function,
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.mv930g_gps_set_updated_at()',
    'EXECUTE'
  ) as authenticated_can_execute_trigger_function,
  pg_catalog.has_function_privilege(
    'service_role',
    'public.mv930g_gps_set_updated_at()',
    'EXECUTE'
  ) as service_role_can_execute_trigger_function;

select
  pg_catalog.pg_get_userbyid(p.proowner) as function_owner,
  p.prosecdef as security_definer,
  p.provolatile = 'v' as volatile_ok,
  p.proconfig @> array['search_path=pg_catalog'] as fixed_search_path_ok,
  not pg_catalog.has_function_privilege(
    'anon',
    'public.mv930g_reserve_ingest_nonce(text)',
    'EXECUTE'
  ) as anon_execute_denied,
  not pg_catalog.has_function_privilege(
    'authenticated',
    'public.mv930g_reserve_ingest_nonce(text)',
    'EXECUTE'
  ) as authenticated_execute_denied,
  pg_catalog.has_function_privilege(
    'service_role',
    'public.mv930g_reserve_ingest_nonce(text)',
    'EXECUTE'
  ) as service_role_execute_allowed
from pg_catalog.pg_proc p
where p.oid = pg_catalog.to_regprocedure('public.mv930g_reserve_ingest_nonce(text)');

with excluded_tables(table_name) as (
  values
    ('gps_customers'),
    ('gps_vehicles'),
    ('gps_devices'),
    ('gps_positions'),
    ('raw_device_logs'),
    ('protocol_parse_errors'),
    ('operation_logs'),
    ('device_command_queue'),
    ('gps_ingest_nonces'),
    ('gps_latest_positions')
),
schema_lines(line) as (
  select pg_catalog.format(
    'REL|%s|%s|%s|%s',
    c.relname,
    c.relkind,
    c.relrowsecurity,
    c.relforcerowsecurity
  )
  from pg_catalog.pg_class c
  where c.relnamespace = 'public'::pg_catalog.regnamespace
    and c.relkind in ('r', 'p', 'v', 'm')
    and not exists (select 1 from excluded_tables e where e.table_name = c.relname)

  union all

  select pg_catalog.format(
    'COL|%s|%s|%s|%s|%s',
    c.relname,
    a.attname,
    pg_catalog.format_type(a.atttypid, a.atttypmod),
    a.attnotnull,
    coalesce(pg_catalog.pg_get_expr(d.adbin, d.adrelid), '')
  )
  from pg_catalog.pg_class c
  join pg_catalog.pg_attribute a on a.attrelid = c.oid
  left join pg_catalog.pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
  where c.relnamespace = 'public'::pg_catalog.regnamespace
    and c.relkind in ('r', 'p', 'v', 'm')
    and a.attnum > 0
    and not a.attisdropped
    and not exists (select 1 from excluded_tables e where e.table_name = c.relname)

  union all

  select pg_catalog.format(
    'CON|%s|%s|%s',
    c.relname,
    con.conname,
    pg_catalog.pg_get_constraintdef(con.oid, true)
  )
  from pg_catalog.pg_constraint con
  join pg_catalog.pg_class c on c.oid = con.conrelid
  where c.relnamespace = 'public'::pg_catalog.regnamespace
    and not exists (select 1 from excluded_tables e where e.table_name = c.relname)

  union all

  select pg_catalog.format(
    'IDX|%s|%s',
    t.relname,
    pg_catalog.pg_get_indexdef(i.indexrelid)
  )
  from pg_catalog.pg_index i
  join pg_catalog.pg_class t on t.oid = i.indrelid
  where t.relnamespace = 'public'::pg_catalog.regnamespace
    and not exists (select 1 from excluded_tables e where e.table_name = t.relname)

  union all

  select pg_catalog.format(
    'POL|%s|%s|%s|%s|%s|%s',
    p.tablename,
    p.policyname,
    p.cmd,
    p.roles,
    coalesce(p.qual, ''),
    coalesce(p.with_check, '')
  )
  from pg_catalog.pg_policies p
  where p.schemaname = 'public'
    and not exists (select 1 from excluded_tables e where e.table_name = p.tablename)

  union all

  select pg_catalog.format(
    'GRANT|%s|%s|%s|%s',
    g.table_name,
    g.grantee,
    g.privilege_type,
    g.is_grantable
  )
  from information_schema.role_table_grants g
  where g.table_schema = 'public'
    and not exists (select 1 from excluded_tables e where e.table_name = g.table_name)
)
select
  pg_catalog.md5(pg_catalog.string_agg(line, E'\n' order by line)) as public_non_gps_schema_fingerprint
from schema_lines;

rollback;

-- Read-only preflight for 202607290034_create_mv930g_gps_schema.sql.
-- Run this before applying the migration and retain the non-GPS fingerprint.

begin;
set transaction read only;

with expected(object_name, expected_kind) as (
  values
    ('gps_customers', 'table'),
    ('gps_vehicles', 'table'),
    ('gps_devices', 'table'),
    ('gps_positions', 'table'),
    ('raw_device_logs', 'table'),
    ('protocol_parse_errors', 'table'),
    ('operation_logs', 'table'),
    ('device_command_queue', 'table'),
    ('gps_latest_positions', 'view')
)
select
  e.object_name,
  e.expected_kind,
  c.relkind as existing_relkind,
  c.oid is null as name_is_available
from expected e
left join pg_catalog.pg_class c
  on c.relname = e.object_name
 and c.relnamespace = 'public'::pg_catalog.regnamespace
order by e.object_name;

select
  pg_catalog.to_regclass('public.profiles') is not null as profiles_table_exists,
  pg_catalog.to_regprocedure('gen_random_uuid()') is not null as gen_random_uuid_exists,
  pg_catalog.to_regprocedure('public.mv930g_gps_set_updated_at()') is null as gps_trigger_function_name_available,
  pg_catalog.to_regrole('anon') is not null as anon_role_exists,
  pg_catalog.to_regrole('authenticated') is not null as authenticated_role_exists,
  pg_catalog.to_regrole('service_role') is not null as service_role_exists,
  pg_catalog.current_setting('server_version_num')::integer >= 150000 as supports_security_invoker_view;

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

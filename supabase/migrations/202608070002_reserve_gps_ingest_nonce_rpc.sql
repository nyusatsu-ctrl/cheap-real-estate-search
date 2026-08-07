-- Reserve MV930G ingest nonces through one least-privilege database entry point.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $mv930g_nonce_rpc_preflight$
declare
  nonce_table_owner text;
  existing_function_owner text;
  unexpected_table_grantees text;
  unexpected_function_grantees text;
begin
  if pg_catalog.to_regclass('public.gps_ingest_nonces') is null then
    raise exception using
      errcode = '42P01',
      message = 'MV930G nonce RPC migration requires public.gps_ingest_nonces.';
  end if;

  select pg_catalog.pg_get_userbyid(c.relowner)
  into nonce_table_owner
  from pg_catalog.pg_class c
  where c.oid = 'public.gps_ingest_nonces'::pg_catalog.regclass;

  if nonce_table_owner <> 'postgres' then
    raise exception using
      errcode = '42501',
      message = 'MV930G nonce RPC migration requires the expected table owner.';
  end if;

  select pg_catalog.string_agg(distinct grants.grantee, ', ' order by grants.grantee)
  into unexpected_table_grantees
  from information_schema.table_privileges grants
  where grants.table_schema = 'public'
    and grants.table_name = 'gps_ingest_nonces'
    and grants.grantee not in ('PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres');

  if unexpected_table_grantees is not null then
    raise exception using
      errcode = '42501',
      message = 'MV930G nonce RPC migration found unexpected table grantees.',
      detail = unexpected_table_grantees;
  end if;

  if pg_catalog.to_regprocedure('public.mv930g_reserve_ingest_nonce(text)') is not null then
    select pg_catalog.pg_get_userbyid(p.proowner)
    into existing_function_owner
    from pg_catalog.pg_proc p
    where p.oid = 'public.mv930g_reserve_ingest_nonce(text)'::pg_catalog.regprocedure;

    if existing_function_owner <> 'postgres' then
      raise exception using
        errcode = '42501',
        message = 'MV930G nonce RPC migration will not replace a function owned by another role.';
    end if;

    select pg_catalog.string_agg(distinct grants.grantee, ', ' order by grants.grantee)
    into unexpected_function_grantees
    from information_schema.routine_privileges grants
    where grants.specific_schema = 'public'
      and grants.routine_name = 'mv930g_reserve_ingest_nonce'
      and grants.grantee not in ('PUBLIC', 'anon', 'authenticated', 'service_role', 'postgres');

    if unexpected_function_grantees is not null then
      raise exception using
        errcode = '42501',
        message = 'MV930G nonce RPC migration found unexpected function grantees.',
        detail = unexpected_function_grantees;
    end if;
  end if;
end;
$mv930g_nonce_rpc_preflight$;

create or replace function public.mv930g_reserve_ingest_nonce(p_nonce_hash text)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $mv930g_reserve_ingest_nonce$
declare
  reservation_time timestamptz := pg_catalog.statement_timestamp();
  reserved boolean;
begin
  delete from public.gps_ingest_nonces
  where expires_at < reservation_time;

  insert into public.gps_ingest_nonces (nonce_hash, expires_at)
  values (p_nonce_hash, reservation_time + interval '10 minutes')
  on conflict on constraint gps_ingest_nonces_pkey do nothing
  returning true into reserved;

  return reserved is true;
end;
$mv930g_reserve_ingest_nonce$;

alter function public.mv930g_reserve_ingest_nonce(text) owner to postgres;

revoke all privileges on table public.gps_ingest_nonces
  from public, anon, authenticated, service_role;
revoke all privileges on function public.mv930g_reserve_ingest_nonce(text)
  from public, anon, authenticated, service_role;
grant execute on function public.mv930g_reserve_ingest_nonce(text) to service_role;

commit;

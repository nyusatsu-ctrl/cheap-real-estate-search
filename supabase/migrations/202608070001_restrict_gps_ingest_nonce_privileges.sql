-- Restrict the MV930G ingest nonce table to the operations used by the ingest API.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

revoke all privileges on table public.gps_ingest_nonces from service_role;
grant insert, delete on table public.gps_ingest_nonces to service_role;

commit;

-- MV930G-G V2.0 JT/T 808-2013 receive-only support.
-- This migration is intentionally local-only until separately reviewed and approved.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $mv930g_jt808_preflight$
declare
  missing_tables text;
  existing_columns text;
  existing_relations text;
begin
  select string_agg(required_name, ', ' order by required_name)
  into missing_tables
  from unnest(array[
    'gps_devices',
    'gps_positions',
    'raw_device_logs',
    'protocol_parse_errors',
    'gps_latest_positions'
  ]::text[]) as required(required_name)
  where pg_catalog.to_regclass('public.' || required_name) is null;

  if missing_tables is not null then
    raise exception using
      errcode = '42P01',
      message = 'MV930G JT808 migration requires the base GPS schema.',
      detail = missing_tables;
  end if;

  if pg_catalog.to_regclass('public.gps_ingest_nonces') is not null then
    raise exception using
      errcode = '42710',
      message = 'MV930G JT808 migration aborted because public.gps_ingest_nonces already exists.';
  end if;

  if (
    select c.relkind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'gps_latest_positions'
  ) <> 'v' then
    raise exception using
      errcode = '42809',
      message = 'MV930G JT808 migration requires public.gps_latest_positions to be a view.';
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
  into existing_relations
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any (array[
      'gps_positions_source_frame_fingerprint_unique',
      'raw_device_logs_protocol_terminal_id_received_idx',
      'raw_device_logs_frame_fingerprint_idx',
      'raw_device_logs_duplicate_of_raw_log_id_idx',
      'gps_ingest_nonces_expires_at_idx'
    ]::text[]);

  if existing_relations is not null then
    raise exception using
      errcode = '42710',
      message = 'MV930G JT808 migration aborted because owned relation names already exist.',
      detail = existing_relations;
  end if;

  select string_agg(format('%I.%I', table_name, column_name), ', ' order by table_name, column_name)
  into existing_columns
  from information_schema.columns
  where table_schema = 'public'
    and (table_name, column_name) in (
      ('gps_devices', 'protocol_terminal_id'),
      ('gps_devices', 'is_active'),
      ('gps_devices', 'jt808_auth_token_hash'),
      ('gps_devices', 'jt808_auth_issued_at'),
      ('gps_devices', 'jt808_registered_at'),
      ('gps_devices', 'last_authenticated_at'),
      ('raw_device_logs', 'protocol_terminal_id'),
      ('raw_device_logs', 'message_id'),
      ('raw_device_logs', 'message_serial'),
      ('raw_device_logs', 'frame_fingerprint'),
      ('raw_device_logs', 'duplicate_of_raw_log_id'),
      ('raw_device_logs', 'checksum_valid'),
      ('raw_device_logs', 'encryption_type'),
      ('raw_device_logs', 'is_subpackage'),
      ('gps_positions', 'source_frame_fingerprint'),
      ('gps_positions', 'alarm_flags'),
      ('gps_positions', 'status_flags'),
      ('gps_positions', 'altitude_meters'),
      ('gps_positions', 'positioning_status'),
      ('gps_positions', 'terminal_time_raw'),
      ('gps_positions', 'mileage_km'),
      ('gps_positions', 'signal_strength'),
      ('gps_positions', 'gnss_satellites'),
      ('gps_positions', 'gps_satellites'),
      ('gps_positions', 'beidou_satellites'),
      ('gps_positions', 'glonass_satellites'),
      ('gps_positions', 'additional_status'),
      ('gps_positions', 'base_station_info'),
      ('gps_positions', 'iccid')
    );

  if existing_columns is not null then
    raise exception using
      errcode = '42701',
      message = 'MV930G JT808 migration aborted because owned columns already exist.',
      detail = existing_columns;
  end if;
end;
$mv930g_jt808_preflight$;

alter table public.gps_devices
  add column protocol_terminal_id text,
  add column is_active boolean not null default true,
  add column jt808_auth_token_hash text,
  add column jt808_auth_issued_at timestamptz,
  add column jt808_registered_at timestamptz,
  add column last_authenticated_at timestamptz,
  add constraint gps_devices_protocol_terminal_id_check check (
    protocol_terminal_id is null or protocol_terminal_id ~ '^[0-9]{12}$'
  ),
  add constraint gps_devices_protocol_terminal_id_unique unique (protocol_terminal_id),
  add constraint gps_devices_jt808_auth_token_hash_check check (
    jt808_auth_token_hash is null or jt808_auth_token_hash ~ '^[a-f0-9]{64}$'
  ),
  add constraint gps_devices_jt808_pairing_check check (
    protocol_terminal_id is not null or (
      jt808_auth_token_hash is null
      and jt808_auth_issued_at is null
      and jt808_registered_at is null
      and last_authenticated_at is null
    )
  );

alter table public.raw_device_logs
  drop constraint raw_device_logs_packet_type_check,
  add column protocol_terminal_id text,
  add column message_id text,
  add column message_serial integer,
  add column frame_fingerprint text,
  add column duplicate_of_raw_log_id uuid,
  add column checksum_valid boolean,
  add column encryption_type smallint,
  add column is_subpackage boolean,
  add constraint raw_device_logs_protocol_terminal_id_check check (
    protocol_terminal_id is null or protocol_terminal_id ~ '^[0-9]{12}$'
  ),
  add constraint raw_device_logs_message_id_check check (
    message_id is null or message_id ~ '^[a-f0-9]{4}$'
  ),
  add constraint raw_device_logs_message_serial_check check (
    message_serial is null or message_serial between 0 and 65535
  ),
  add constraint raw_device_logs_frame_fingerprint_check check (
    frame_fingerprint is null or frame_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  add constraint raw_device_logs_duplicate_of_raw_log_id_fkey foreign key (duplicate_of_raw_log_id)
    references public.raw_device_logs(id) on delete set null,
  add constraint raw_device_logs_encryption_type_check check (
    encryption_type is null or encryption_type between 0 and 7
  ),
  add constraint raw_device_logs_packet_type_check check (
    packet_type in (
      'terminal_response',
      'heartbeat',
      'terminal_logout',
      'terminal_registration',
      'terminal_authentication',
      'location_report',
      'transparent_uplink',
      'unknown'
    )
  );

alter table public.gps_positions
  add column source_frame_fingerprint text,
  add column alarm_flags bigint,
  add column status_flags bigint,
  add column altitude_meters integer,
  add column positioning_status text,
  add column terminal_time_raw text,
  add column mileage_km numeric(12,1),
  add column signal_strength smallint,
  add column gnss_satellites smallint,
  add column gps_satellites smallint,
  add column beidou_satellites smallint,
  add column glonass_satellites smallint,
  add column additional_status jsonb,
  add column base_station_info jsonb,
  add column iccid text,
  add constraint gps_positions_source_frame_fingerprint_check check (
    source_frame_fingerprint is null or source_frame_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  add constraint gps_positions_alarm_flags_check check (
    alarm_flags is null or alarm_flags between 0 and 4294967295
  ),
  add constraint gps_positions_status_flags_check check (
    status_flags is null or status_flags between 0 and 4294967295
  ),
  add constraint gps_positions_altitude_meters_check check (
    altitude_meters is null or altitude_meters between 0 and 65535
  ),
  add constraint gps_positions_positioning_status_check check (
    positioning_status is null or positioning_status in ('positioned', 'not_positioned')
  ),
  add constraint gps_positions_terminal_time_raw_check check (
    terminal_time_raw is null or terminal_time_raw ~ '^[0-9]{12}$'
  ),
  add constraint gps_positions_mileage_km_check check (mileage_km is null or mileage_km >= 0),
  add constraint gps_positions_signal_strength_check check (
    signal_strength is null or signal_strength between 0 and 255
  ),
  add constraint gps_positions_satellite_counts_check check (
    (gnss_satellites is null or gnss_satellites between 0 and 255)
    and (gps_satellites is null or gps_satellites between 0 and 255)
    and (beidou_satellites is null or beidou_satellites between 0 and 255)
    and (glonass_satellites is null or glonass_satellites between 0 and 255)
  ),
  add constraint gps_positions_additional_status_check check (
    additional_status is null or pg_catalog.jsonb_typeof(additional_status) = 'object'
  ),
  add constraint gps_positions_base_station_info_check check (
    base_station_info is null or pg_catalog.jsonb_typeof(base_station_info) = 'object'
  ),
  add constraint gps_positions_iccid_check check (
    iccid is null or pg_catalog.length(iccid) between 18 and 22
  );

create unique index gps_positions_source_frame_fingerprint_unique
  on public.gps_positions (source_frame_fingerprint)
  where source_frame_fingerprint is not null;
create index raw_device_logs_protocol_terminal_id_received_idx
  on public.raw_device_logs (protocol_terminal_id, received_at desc);
create index raw_device_logs_frame_fingerprint_idx
  on public.raw_device_logs (frame_fingerprint, received_at desc);
create index raw_device_logs_duplicate_of_raw_log_id_idx
  on public.raw_device_logs (duplicate_of_raw_log_id)
  where duplicate_of_raw_log_id is not null;

create or replace view public.gps_latest_positions
with (security_invoker = true, security_barrier = true)
as
select distinct on (p.device_id)
  p.id,
  p.device_id,
  p.vehicle_id,
  p.raw_log_id,
  p.latitude,
  p.longitude,
  p.speed_kmh,
  p.heading_degrees,
  p.acc_status,
  p.relay_status,
  p.vehicle_voltage,
  p.located_at,
  p.received_at,
  p.created_at,
  d.device_name,
  d.imei,
  d.device_identifier,
  d.connection_status,
  d.last_seen_at,
  v.vehicle_type,
  v.maker,
  v.model_name,
  v.license_plate,
  c.full_name as customer_name,
  c.phone as customer_phone,
  c.contract_status,
  p.source_frame_fingerprint,
  p.alarm_flags,
  p.status_flags,
  p.altitude_meters,
  p.positioning_status,
  p.terminal_time_raw,
  p.mileage_km,
  p.signal_strength,
  p.gnss_satellites,
  p.gps_satellites,
  p.beidou_satellites,
  p.glonass_satellites,
  p.additional_status,
  p.base_station_info,
  p.iccid
from public.gps_positions p
left join public.gps_devices d on d.id = p.device_id
left join public.gps_vehicles v on v.id = p.vehicle_id
left join public.gps_customers c on c.id = v.customer_id
where p.device_id is not null
order by p.device_id, p.received_at desc, p.created_at desc, p.id desc;

create table public.gps_ingest_nonces (
  nonce_hash text,
  received_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  constraint gps_ingest_nonces_pkey primary key (nonce_hash),
  constraint gps_ingest_nonces_nonce_hash_check check (nonce_hash ~ '^[a-f0-9]{64}$'),
  constraint gps_ingest_nonces_expiry_check check (expires_at > received_at)
);

create index gps_ingest_nonces_expires_at_idx on public.gps_ingest_nonces (expires_at);

alter table public.gps_ingest_nonces enable row level security;
alter table public.gps_ingest_nonces force row level security;

revoke all on table public.gps_ingest_nonces from public, anon, authenticated;
grant insert, delete on table public.gps_ingest_nonces to service_role;

comment on column public.gps_devices.protocol_terminal_id is
  'JT/T 808 six-byte BCD terminal ID. It is distinct from IMEI and is admin-linked after first receipt.';
comment on column public.gps_devices.jt808_auth_token_hash is
  'SHA-256 hash of the per-device random JT/T 808 authentication code; plaintext is never stored.';
comment on column public.raw_device_logs.frame_fingerprint is
  'SHA-256 fingerprint used to suppress duplicate derived positions while preserving every raw receipt.';
comment on table public.gps_ingest_nonces is
  'Single-use HMAC ingest nonces. Repeated nonce hashes are rejected by the primary key.';

commit;

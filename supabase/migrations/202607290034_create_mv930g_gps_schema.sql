-- MV930G GPS schema for the shared production Supabase project.
-- Scope: eight GPS tables, one latest-position view, one GPS-only trigger
-- function, GPS-only indexes, comments, RLS, and least-privilege grants.
-- This migration intentionally aborts when any owned object name already exists.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $mv930g_preflight$
declare
  collision_names text;
begin
  select string_agg(format('%I (%s)', c.relname, c.relkind), ', ' order by c.relname)
  into collision_names
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any (array[
      'gps_customers',
      'gps_vehicles',
      'gps_devices',
      'gps_positions',
      'raw_device_logs',
      'protocol_parse_errors',
      'operation_logs',
      'device_command_queue',
      'gps_latest_positions',
      'gps_customers_contract_status_idx',
      'gps_customers_contract_type_idx',
      'gps_customers_full_name_idx',
      'gps_vehicles_customer_id_idx',
      'gps_vehicles_vehicle_type_idx',
      'gps_vehicles_license_plate_idx',
      'gps_vehicles_vin_idx',
      'gps_devices_vehicle_id_idx',
      'gps_devices_connection_status_idx',
      'gps_devices_last_seen_at_idx',
      'gps_devices_last_raw_log_id_idx',
      'gps_positions_device_received_idx',
      'gps_positions_vehicle_received_idx',
      'gps_positions_raw_log_id_idx',
      'gps_positions_received_at_idx',
      'raw_device_logs_received_at_idx',
      'raw_device_logs_device_identifier_idx',
      'raw_device_logs_imei_idx',
      'raw_device_logs_packet_type_idx',
      'raw_device_logs_parse_status_idx',
      'protocol_parse_errors_raw_log_id_idx',
      'operation_logs_actor_profile_id_idx',
      'operation_logs_device_id_idx',
      'operation_logs_vehicle_id_idx',
      'operation_logs_created_at_idx',
      'device_command_queue_operation_log_id_idx',
      'device_command_queue_device_status_idx',
      'device_command_queue_status_queued_idx'
    ]::text[]);

  if collision_names is not null then
    raise exception using
      errcode = '42710',
      message = 'MV930G GPS migration aborted because owned object names already exist.',
      detail = collision_names,
      hint = 'Do not overwrite existing objects. Inspect the database and create a reconciliation migration.';
  end if;

  if pg_catalog.to_regprocedure('public.mv930g_gps_set_updated_at()') is not null then
    raise exception using
      errcode = '42710',
      message = 'MV930G GPS migration aborted because public.mv930g_gps_set_updated_at() already exists.';
  end if;

  if pg_catalog.to_regclass('public.profiles') is null then
    raise exception using
      errcode = '42P01',
      message = 'MV930G GPS migration requires the existing public.profiles table.';
  end if;

  if pg_catalog.to_regprocedure('gen_random_uuid()') is null then
    raise exception using
      errcode = '42883',
      message = 'MV930G GPS migration requires gen_random_uuid().';
  end if;

  if pg_catalog.current_setting('server_version_num')::integer < 150000 then
    raise exception using
      errcode = '0A000',
      message = 'MV930G GPS migration requires PostgreSQL 15 or newer for security_invoker views.';
  end if;

  if pg_catalog.to_regrole('anon') is null
    or pg_catalog.to_regrole('authenticated') is null
    or pg_catalog.to_regrole('service_role') is null then
    raise exception using
      errcode = '42704',
      message = 'MV930G GPS migration requires the Supabase anon, authenticated, and service_role roles.';
  end if;
end;
$mv930g_preflight$;

create function public.mv930g_gps_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $mv930g_updated_at$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$mv930g_updated_at$;

create table public.gps_customers (
  id uuid default gen_random_uuid(),
  full_name text not null,
  phone text,
  address text,
  email text,
  contract_type text not null,
  contract_status text not null default 'screening',
  notes text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint gps_customers_pkey primary key (id),
  constraint gps_customers_full_name_check check (
    pg_catalog.length(pg_catalog.btrim(full_name)) between 1 and 120
  ),
  constraint gps_customers_phone_check check (phone is null or pg_catalog.length(phone) <= 50),
  constraint gps_customers_address_check check (address is null or pg_catalog.length(address) <= 300),
  constraint gps_customers_email_check check (email is null or pg_catalog.length(email) <= 254),
  constraint gps_customers_contract_type_check check (contract_type in ('car', 'bike')),
  constraint gps_customers_contract_status_check check (
    contract_status in ('screening', 'active', 'overdue', 'paid_off', 'cancelled')
  ),
  constraint gps_customers_notes_check check (notes is null or pg_catalog.length(notes) <= 2000)
);

create table public.gps_vehicles (
  id uuid default gen_random_uuid(),
  customer_id uuid,
  vehicle_type text not null,
  maker text,
  model_name text,
  model_year integer,
  vin text,
  license_plate text,
  status text not null default 'active',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint gps_vehicles_pkey primary key (id),
  constraint gps_vehicles_customer_id_fkey foreign key (customer_id)
    references public.gps_customers(id) on delete set null,
  constraint gps_vehicles_vehicle_type_check check (vehicle_type in ('car', 'bike')),
  constraint gps_vehicles_maker_check check (maker is null or pg_catalog.length(maker) <= 100),
  constraint gps_vehicles_model_name_check check (model_name is null or pg_catalog.length(model_name) <= 160),
  constraint gps_vehicles_model_year_check check (
    model_year is null or model_year between 1900 and 2100
  ),
  constraint gps_vehicles_vin_check check (vin is null or pg_catalog.length(vin) <= 100),
  constraint gps_vehicles_license_plate_check check (
    license_plate is null or pg_catalog.length(license_plate) <= 100
  ),
  constraint gps_vehicles_identity_check check (
    model_name is not null or vin is not null or license_plate is not null
  ),
  constraint gps_vehicles_status_check check (status in ('active', 'sold', 'returned', 'inactive'))
);

create table public.raw_device_logs (
  id uuid default gen_random_uuid(),
  transport text not null,
  remote_address text,
  remote_port integer,
  local_port integer,
  device_identifier text,
  imei text,
  packet_type text not null default 'unknown',
  raw_hex text not null,
  raw_text text,
  parsed_payload jsonb not null default '{}'::jsonb,
  parse_status text not null default 'pending',
  received_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  constraint raw_device_logs_pkey primary key (id),
  constraint raw_device_logs_transport_check check (transport in ('tcp', 'udp')),
  constraint raw_device_logs_remote_port_check check (
    remote_port is null or remote_port between 1 and 65535
  ),
  constraint raw_device_logs_local_port_check check (
    local_port is null or local_port between 1 and 65535
  ),
  constraint raw_device_logs_packet_type_check check (
    packet_type in ('terminal_authentication', 'heartbeat', 'location_report', 'unknown')
  ),
  constraint raw_device_logs_raw_hex_check check (pg_catalog.length(raw_hex) > 0),
  constraint raw_device_logs_parsed_payload_check check (
    pg_catalog.jsonb_typeof(parsed_payload) = 'object'
  ),
  constraint raw_device_logs_parse_status_check check (
    parse_status in ('pending', 'parsed', 'failed', 'unsupported')
  )
);

create table public.gps_devices (
  id uuid default gen_random_uuid(),
  vehicle_id uuid,
  device_name text not null,
  imei text not null,
  device_identifier text not null,
  sim_phone_number text,
  iccid text,
  connection_status text not null default 'offline',
  last_seen_at timestamptz,
  last_raw_log_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint gps_devices_pkey primary key (id),
  constraint gps_devices_vehicle_id_fkey foreign key (vehicle_id)
    references public.gps_vehicles(id) on delete set null,
  constraint gps_devices_last_raw_log_id_fkey foreign key (last_raw_log_id)
    references public.raw_device_logs(id) on delete set null,
  constraint gps_devices_imei_unique unique (imei),
  constraint gps_devices_device_identifier_unique unique (device_identifier),
  constraint gps_devices_device_name_check check (
    pg_catalog.length(pg_catalog.btrim(device_name)) between 1 and 120
  ),
  constraint gps_devices_imei_check check (imei ~ '^[0-9]{14,16}$'),
  constraint gps_devices_device_identifier_check check (
    device_identifier ~ '^[A-Za-z0-9_-]{6,64}$'
  ),
  constraint gps_devices_sim_phone_number_check check (
    sim_phone_number is null or pg_catalog.length(sim_phone_number) <= 64
  ),
  constraint gps_devices_iccid_check check (iccid is null or pg_catalog.length(iccid) <= 64),
  constraint gps_devices_connection_status_check check (connection_status in ('online', 'offline'))
);

create table public.gps_positions (
  id uuid default gen_random_uuid(),
  device_id uuid,
  vehicle_id uuid,
  raw_log_id uuid,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  speed_kmh numeric(8,2),
  heading_degrees numeric(6,2),
  acc_status text not null default 'unknown',
  relay_status text not null default 'unknown',
  vehicle_voltage numeric(6,2),
  located_at timestamptz,
  received_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  constraint gps_positions_pkey primary key (id),
  constraint gps_positions_device_id_fkey foreign key (device_id)
    references public.gps_devices(id) on delete set null,
  constraint gps_positions_vehicle_id_fkey foreign key (vehicle_id)
    references public.gps_vehicles(id) on delete set null,
  constraint gps_positions_raw_log_id_fkey foreign key (raw_log_id)
    references public.raw_device_logs(id) on delete set null,
  constraint gps_positions_latitude_check check (latitude between -90 and 90),
  constraint gps_positions_longitude_check check (longitude between -180 and 180),
  constraint gps_positions_speed_kmh_check check (speed_kmh is null or speed_kmh >= 0),
  constraint gps_positions_heading_degrees_check check (
    heading_degrees is null or (heading_degrees >= 0 and heading_degrees < 360)
  ),
  constraint gps_positions_acc_status_check check (acc_status in ('on', 'off', 'unknown')),
  constraint gps_positions_relay_status_check check (
    relay_status in ('cut', 'restored', 'unknown')
  ),
  constraint gps_positions_vehicle_voltage_check check (
    vehicle_voltage is null or vehicle_voltage >= 0
  )
);

create table public.protocol_parse_errors (
  id uuid default gen_random_uuid(),
  raw_log_id uuid not null,
  parser_version text,
  error_type text not null,
  error_message text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint protocol_parse_errors_pkey primary key (id),
  constraint protocol_parse_errors_raw_log_id_fkey foreign key (raw_log_id)
    references public.raw_device_logs(id) on delete restrict,
  constraint protocol_parse_errors_error_type_check check (
    pg_catalog.length(pg_catalog.btrim(error_type)) > 0
  ),
  constraint protocol_parse_errors_error_message_check check (
    pg_catalog.length(pg_catalog.btrim(error_message)) > 0
  )
);

create table public.operation_logs (
  id uuid default gen_random_uuid(),
  actor_profile_id uuid,
  device_id uuid,
  vehicle_id uuid,
  operation_type text not null,
  confirmation_text text not null,
  reason text not null,
  request_payload jsonb not null default '{}'::jsonb,
  result_status text not null default 'cancelled',
  result_message text,
  created_at timestamptz not null default statement_timestamp(),
  executed_at timestamptz,
  constraint operation_logs_pkey primary key (id),
  constraint operation_logs_actor_profile_id_fkey foreign key (actor_profile_id)
    references public.profiles(id) on delete set null,
  constraint operation_logs_device_id_fkey foreign key (device_id)
    references public.gps_devices(id) on delete set null,
  constraint operation_logs_vehicle_id_fkey foreign key (vehicle_id)
    references public.gps_vehicles(id) on delete set null,
  constraint operation_logs_operation_type_check check (
    operation_type in (
      'safe_cut',
      'restore',
      'arm',
      'disarm',
      'customer_create',
      'customer_update',
      'customer_deactivate',
      'vehicle_create',
      'vehicle_update',
      'vehicle_deactivate',
      'device_create',
      'device_update',
      'device_deactivate'
    )
  ),
  constraint operation_logs_confirmation_text_check check (
    pg_catalog.length(pg_catalog.btrim(confirmation_text)) > 0
  ),
  constraint operation_logs_reason_check check (
    pg_catalog.length(pg_catalog.btrim(reason)) > 0
  ),
  constraint operation_logs_request_payload_check check (
    pg_catalog.jsonb_typeof(request_payload) = 'object'
  ),
  constraint operation_logs_phase1_disabled_check check (
    request_payload::text !~* 'RELAY[[:space:]]*,[[:space:]]*[12][[:space:]]*#'
    and (
      (
        operation_type in ('safe_cut', 'restore', 'arm', 'disarm')
        and result_status = 'cancelled'
        and executed_at is null
      )
      or
      (
        operation_type in (
          'customer_create',
          'customer_update',
          'customer_deactivate',
          'vehicle_create',
          'vehicle_update',
          'vehicle_deactivate',
          'device_create',
          'device_update',
          'device_deactivate'
        )
        and result_status in ('queued', 'acknowledged', 'failed')
        and (
          (result_status = 'acknowledged' and executed_at is not null)
          or (result_status in ('queued', 'failed') and executed_at is null)
        )
      )
    )
  )
);

create table public.device_command_queue (
  id uuid default gen_random_uuid(),
  operation_log_id uuid,
  device_id uuid not null,
  command_type text not null,
  command_payload jsonb not null default '{}'::jsonb,
  command_hex text,
  status text not null default 'cancelled',
  attempts integer not null default 0,
  last_error_message text,
  queued_at timestamptz not null default statement_timestamp(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint device_command_queue_pkey primary key (id),
  constraint device_command_queue_operation_log_id_fkey foreign key (operation_log_id)
    references public.operation_logs(id) on delete set null,
  constraint device_command_queue_device_id_fkey foreign key (device_id)
    references public.gps_devices(id) on delete restrict,
  constraint device_command_queue_command_type_check check (
    command_type in ('arm', 'disarm')
  ),
  constraint device_command_queue_command_payload_check check (
    pg_catalog.jsonb_typeof(command_payload) = 'object'
    and command_payload::text !~* 'RELAY[[:space:]]*,[[:space:]]*[12][[:space:]]*#'
    and command_payload::text !~* '"(safe_cut|restore)"'
  ),
  constraint device_command_queue_phase1_disabled_check check (
    status = 'cancelled'
    and attempts = 0
    and command_hex is null
    and sent_at is null
    and acknowledged_at is null
  )
);

create trigger gps_customers_set_updated_at
before update on public.gps_customers
for each row execute function public.mv930g_gps_set_updated_at();

create trigger gps_vehicles_set_updated_at
before update on public.gps_vehicles
for each row execute function public.mv930g_gps_set_updated_at();

create trigger gps_devices_set_updated_at
before update on public.gps_devices
for each row execute function public.mv930g_gps_set_updated_at();

create trigger device_command_queue_set_updated_at
before update on public.device_command_queue
for each row execute function public.mv930g_gps_set_updated_at();

create index gps_customers_contract_status_idx
  on public.gps_customers (contract_status);
create index gps_customers_contract_type_idx
  on public.gps_customers (contract_type);
create index gps_customers_full_name_idx
  on public.gps_customers (full_name);

create index gps_vehicles_customer_id_idx
  on public.gps_vehicles (customer_id);
create index gps_vehicles_vehicle_type_idx
  on public.gps_vehicles (vehicle_type);
create index gps_vehicles_license_plate_idx
  on public.gps_vehicles (license_plate);
create index gps_vehicles_vin_idx
  on public.gps_vehicles (vin);

create index gps_devices_vehicle_id_idx
  on public.gps_devices (vehicle_id);
create index gps_devices_connection_status_idx
  on public.gps_devices (connection_status);
create index gps_devices_last_seen_at_idx
  on public.gps_devices (last_seen_at desc);
create index gps_devices_last_raw_log_id_idx
  on public.gps_devices (last_raw_log_id);

create index gps_positions_device_received_idx
  on public.gps_positions (device_id, received_at desc, created_at desc, id desc);
create index gps_positions_vehicle_received_idx
  on public.gps_positions (vehicle_id, received_at desc, created_at desc, id desc);
create index gps_positions_raw_log_id_idx
  on public.gps_positions (raw_log_id);
create index gps_positions_received_at_idx
  on public.gps_positions (received_at desc);

create index raw_device_logs_received_at_idx
  on public.raw_device_logs (received_at desc);
create index raw_device_logs_device_identifier_idx
  on public.raw_device_logs (device_identifier);
create index raw_device_logs_imei_idx
  on public.raw_device_logs (imei);
create index raw_device_logs_packet_type_idx
  on public.raw_device_logs (packet_type);
create index raw_device_logs_parse_status_idx
  on public.raw_device_logs (parse_status);

create index protocol_parse_errors_raw_log_id_idx
  on public.protocol_parse_errors (raw_log_id);

create index operation_logs_actor_profile_id_idx
  on public.operation_logs (actor_profile_id);
create index operation_logs_device_id_idx
  on public.operation_logs (device_id);
create index operation_logs_vehicle_id_idx
  on public.operation_logs (vehicle_id);
create index operation_logs_created_at_idx
  on public.operation_logs (created_at desc);

create index device_command_queue_operation_log_id_idx
  on public.device_command_queue (operation_log_id);
create index device_command_queue_device_status_idx
  on public.device_command_queue (device_id, status);
create index device_command_queue_status_queued_idx
  on public.device_command_queue (status, queued_at);

create view public.gps_latest_positions
with (security_invoker = true, security_barrier = true)
as
select distinct on (p.device_id)
  p.*,
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
  c.contract_status
from public.gps_positions p
left join public.gps_devices d on d.id = p.device_id
left join public.gps_vehicles v on v.id = p.vehicle_id
left join public.gps_customers c on c.id = v.customer_id
where p.device_id is not null
order by p.device_id, p.received_at desc, p.created_at desc, p.id desc;

alter table public.gps_customers enable row level security;
alter table public.gps_customers force row level security;
alter table public.gps_vehicles enable row level security;
alter table public.gps_vehicles force row level security;
alter table public.gps_devices enable row level security;
alter table public.gps_devices force row level security;
alter table public.gps_positions enable row level security;
alter table public.gps_positions force row level security;
alter table public.raw_device_logs enable row level security;
alter table public.raw_device_logs force row level security;
alter table public.protocol_parse_errors enable row level security;
alter table public.protocol_parse_errors force row level security;
alter table public.operation_logs enable row level security;
alter table public.operation_logs force row level security;
alter table public.device_command_queue enable row level security;
alter table public.device_command_queue force row level security;

-- No row policies are created in Phase 1. Without a policy, RLS is default-deny.
-- The server must authenticate the administrator and then use a service-role
-- client that does not inherit a user session.
revoke all on table
  public.gps_customers,
  public.gps_vehicles,
  public.gps_devices,
  public.gps_positions,
  public.raw_device_logs,
  public.protocol_parse_errors,
  public.operation_logs,
  public.device_command_queue
from public, anon, authenticated, service_role;

grant select, insert, update on table
  public.gps_customers,
  public.gps_vehicles,
  public.gps_devices,
  public.gps_positions,
  public.raw_device_logs,
  public.protocol_parse_errors,
  public.operation_logs,
  public.device_command_queue
to service_role;

revoke all on table public.gps_latest_positions from public, anon, authenticated, service_role;
grant select on table public.gps_latest_positions to service_role;

revoke all on function public.mv930g_gps_set_updated_at() from public, anon, authenticated, service_role;
grant execute on function public.mv930g_gps_set_updated_at() to service_role;

comment on function public.mv930g_gps_set_updated_at() is
  'MV930G GPS tables only: refreshes updated_at before UPDATE without replacing shared functions.';

comment on table public.gps_customers is
  'MV930G GPS management customers. Accessible only through authenticated server-side administration.';
comment on column public.gps_customers.id is 'GPS customer UUID primary key.';
comment on column public.gps_customers.full_name is 'Customer name used by the GPS administration screen.';
comment on column public.gps_customers.phone is 'Customer phone number; sensitive and service-role only.';
comment on column public.gps_customers.address is 'Customer address; sensitive and service-role only.';
comment on column public.gps_customers.email is 'Customer email address; sensitive and service-role only.';
comment on column public.gps_customers.contract_type is 'Contract vehicle category: car or bike.';
comment on column public.gps_customers.contract_status is 'GPS contract lifecycle status.';
comment on column public.gps_customers.notes is 'Internal GPS administration notes.';
comment on column public.gps_customers.created_at is 'Row creation timestamp.';
comment on column public.gps_customers.updated_at is 'Last row update timestamp maintained by GPS trigger.';

comment on table public.gps_vehicles is
  'Vehicles or motorcycles managed by the MV930G GPS system.';
comment on column public.gps_vehicles.id is 'GPS vehicle UUID primary key.';
comment on column public.gps_vehicles.customer_id is 'Optional owning GPS customer; SET NULL preserves vehicle history.';
comment on column public.gps_vehicles.vehicle_type is 'Vehicle category: car or bike.';
comment on column public.gps_vehicles.maker is 'Vehicle manufacturer.';
comment on column public.gps_vehicles.model_name is 'Vehicle name and model designation used by the current code.';
comment on column public.gps_vehicles.model_year is 'Model year between 1900 and 2100.';
comment on column public.gps_vehicles.vin is 'Vehicle identification or chassis number.';
comment on column public.gps_vehicles.license_plate is 'Vehicle registration number.';
comment on column public.gps_vehicles.status is 'Vehicle lifecycle status; inactive is used for logical deactivation.';
comment on column public.gps_vehicles.created_at is 'Row creation timestamp.';
comment on column public.gps_vehicles.updated_at is 'Last row update timestamp maintained by GPS trigger.';

comment on table public.raw_device_logs is
  'Raw MV930G TCP or UDP payloads persisted before parsing. Contains sensitive device identifiers.';
comment on column public.raw_device_logs.id is 'Raw log UUID primary key.';
comment on column public.raw_device_logs.transport is 'Transport protocol: tcp or udp.';
comment on column public.raw_device_logs.remote_address is 'Remote network address observed by the receiver.';
comment on column public.raw_device_logs.remote_port is 'Remote network port observed by the receiver.';
comment on column public.raw_device_logs.local_port is 'Local receiver port.';
comment on column public.raw_device_logs.device_identifier is 'Parsed terminal identifier when available.';
comment on column public.raw_device_logs.imei is 'Parsed IMEI when available; sensitive and service-role only.';
comment on column public.raw_device_logs.packet_type is 'Minimal MV930G packet classification.';
comment on column public.raw_device_logs.raw_hex is 'Original payload represented as hexadecimal text.';
comment on column public.raw_device_logs.raw_text is 'Printable original payload when safely representable.';
comment on column public.raw_device_logs.parsed_payload is 'Parser output without changing the original raw payload.';
comment on column public.raw_device_logs.parse_status is 'Parser workflow state.';
comment on column public.raw_device_logs.received_at is 'Server receive timestamp.';
comment on column public.raw_device_logs.created_at is 'Row creation timestamp.';

comment on table public.gps_devices is
  'MV930G terminals linked to vehicles. IMEI and terminal ID are unique and sensitive.';
comment on column public.gps_devices.id is 'GPS terminal UUID primary key.';
comment on column public.gps_devices.vehicle_id is 'Optional linked vehicle; SET NULL preserves terminal history.';
comment on column public.gps_devices.device_name is 'Model name or internal terminal management name.';
comment on column public.gps_devices.imei is 'Unique 14 to 16 digit IMEI.';
comment on column public.gps_devices.device_identifier is 'Unique 6 to 64 character terminal identifier.';
comment on column public.gps_devices.sim_phone_number is 'SIM management number; not exposed to browser clients.';
comment on column public.gps_devices.iccid is 'SIM management label or ICCID; not exposed to browser clients.';
comment on column public.gps_devices.connection_status is 'Last known online or offline state.';
comment on column public.gps_devices.last_seen_at is 'Last successful terminal communication timestamp.';
comment on column public.gps_devices.last_raw_log_id is 'Most recent associated raw log; SET NULL preserves the device.';
comment on column public.gps_devices.created_at is 'Row creation timestamp.';
comment on column public.gps_devices.updated_at is 'Last row update timestamp maintained by GPS trigger.';

comment on table public.gps_positions is
  'Parsed MV930G position history. Physical deletes of related master records never cascade here.';
comment on column public.gps_positions.id is 'Position UUID primary key.';
comment on column public.gps_positions.device_id is 'Source terminal; SET NULL preserves position history.';
comment on column public.gps_positions.vehicle_id is 'Associated vehicle; SET NULL preserves position history.';
comment on column public.gps_positions.raw_log_id is 'Source raw log; SET NULL preserves position history.';
comment on column public.gps_positions.latitude is 'Latitude in decimal degrees.';
comment on column public.gps_positions.longitude is 'Longitude in decimal degrees.';
comment on column public.gps_positions.speed_kmh is 'Reported speed in kilometres per hour.';
comment on column public.gps_positions.heading_degrees is 'Reported heading from 0 inclusive to 360 exclusive.';
comment on column public.gps_positions.acc_status is 'Observed ACC state; not a command.';
comment on column public.gps_positions.relay_status is 'Observed relay state only; never authorizes relay control.';
comment on column public.gps_positions.vehicle_voltage is 'Observed vehicle or external supply voltage.';
comment on column public.gps_positions.located_at is 'Terminal-reported location timestamp when available.';
comment on column public.gps_positions.received_at is 'Server receive timestamp.';
comment on column public.gps_positions.created_at is 'Row creation timestamp.';

comment on table public.protocol_parse_errors is
  'MV930G parser errors linked to immutable raw logs.';
comment on column public.protocol_parse_errors.id is 'Parser error UUID primary key.';
comment on column public.protocol_parse_errors.raw_log_id is 'Required raw log; RESTRICT prevents history loss.';
comment on column public.protocol_parse_errors.parser_version is 'Parser version that produced the error.';
comment on column public.protocol_parse_errors.error_type is 'Stable parser error classification.';
comment on column public.protocol_parse_errors.error_message is 'Internal parser diagnostic; service-role only.';
comment on column public.protocol_parse_errors.created_at is 'Row creation timestamp.';

comment on table public.operation_logs is
  'GPS administration audit history. Device commands remain cancelled; authenticated CRUD audit rows track start, success, or failure.';
comment on column public.operation_logs.id is 'Operation log UUID primary key.';
comment on column public.operation_logs.actor_profile_id is 'Optional existing administrator profile; SET NULL preserves audit history.';
comment on column public.operation_logs.device_id is 'Optional target terminal; SET NULL preserves audit history.';
comment on column public.operation_logs.vehicle_id is 'Optional target vehicle; SET NULL preserves audit history.';
comment on column public.operation_logs.operation_type is 'Device-command cancellation label or GPS customer, vehicle, and device administration audit action.';
comment on column public.operation_logs.confirmation_text is 'Safety confirmation shown to the administrator.';
comment on column public.operation_logs.reason is 'Recorded reason for the cancelled operation.';
comment on column public.operation_logs.request_payload is 'Non-executed request metadata; raw RELAY commands are prohibited.';
comment on column public.operation_logs.result_status is 'Device commands are cancelled; administration audits use queued, acknowledged, or failed.';
comment on column public.operation_logs.result_message is 'Cancellation or audit result detail.';
comment on column public.operation_logs.created_at is 'Row creation timestamp.';
comment on column public.operation_logs.executed_at is 'NULL for device commands and unfinished audits; set only after an administration change succeeds.';

comment on table public.device_command_queue is
  'Disabled MV930G command audit queue. No executable, sent, or relay command can be stored in Phase 1.';
comment on column public.device_command_queue.id is 'Command audit UUID primary key.';
comment on column public.device_command_queue.operation_log_id is 'Optional cancelled operation log.';
comment on column public.device_command_queue.device_id is 'Required target terminal; RESTRICT prevents deleting terminal history.';
comment on column public.device_command_queue.command_type is 'Only non-relay arm or disarm labels are accepted; never executed.';
comment on column public.device_command_queue.command_payload is 'Non-executed metadata; relay strings and safe_cut or restore are rejected.';
comment on column public.device_command_queue.command_hex is 'Always NULL while device command transmission is disabled.';
comment on column public.device_command_queue.status is 'Always cancelled while device command transmission is disabled.';
comment on column public.device_command_queue.attempts is 'Always zero while no command worker exists.';
comment on column public.device_command_queue.last_error_message is 'Reason the non-executed audit entry was cancelled.';
comment on column public.device_command_queue.queued_at is 'Audit request timestamp; no worker consumes the row.';
comment on column public.device_command_queue.sent_at is 'Always NULL while transmission is disabled.';
comment on column public.device_command_queue.acknowledged_at is 'Always NULL while transmission is disabled.';
comment on column public.device_command_queue.created_at is 'Row creation timestamp.';
comment on column public.device_command_queue.updated_at is 'Last row update timestamp maintained by GPS trigger.';

comment on view public.gps_latest_positions is
  'Latest position per non-null device with deterministic ordering; security_invoker and service-role only.';

commit;

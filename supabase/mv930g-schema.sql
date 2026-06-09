create extension if not exists "pgcrypto";

create table if not exists public.gps_customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  address text,
  email text,
  contract_type text not null check (contract_type in ('car', 'bike')),
  contract_status text not null default 'screening' check (contract_status in ('screening', 'active', 'overdue', 'paid_off', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gps_vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.gps_customers(id) on delete set null,
  vehicle_type text not null check (vehicle_type in ('car', 'bike')),
  maker text,
  model_name text,
  model_year integer check (model_year is null or (model_year >= 1900 and model_year <= 2100)),
  vin text,
  license_plate text,
  status text not null default 'active' check (status in ('active', 'sold', 'returned', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_device_logs (
  id uuid primary key default gen_random_uuid(),
  transport text not null check (transport in ('tcp', 'udp')),
  remote_address text,
  remote_port integer,
  local_port integer,
  device_identifier text,
  imei text,
  packet_type text not null default 'unknown' check (packet_type in ('terminal_authentication', 'heartbeat', 'location_report', 'unknown')),
  raw_hex text not null,
  raw_text text,
  parsed_payload jsonb not null default '{}'::jsonb,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'failed', 'unsupported')),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.gps_devices (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.gps_vehicles(id) on delete set null,
  device_name text not null,
  imei text not null unique,
  device_identifier text not null unique,
  sim_phone_number text,
  iccid text,
  connection_status text not null default 'offline' check (connection_status in ('online', 'offline')),
  last_seen_at timestamptz,
  last_raw_log_id uuid references public.raw_device_logs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gps_positions (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.gps_devices(id) on delete set null,
  vehicle_id uuid references public.gps_vehicles(id) on delete set null,
  raw_log_id uuid references public.raw_device_logs(id) on delete set null,
  latitude numeric(10,7) not null check (latitude >= -90 and latitude <= 90),
  longitude numeric(10,7) not null check (longitude >= -180 and longitude <= 180),
  speed_kmh numeric(8,2) check (speed_kmh is null or speed_kmh >= 0),
  heading_degrees numeric(6,2) check (heading_degrees is null or (heading_degrees >= 0 and heading_degrees < 360)),
  acc_status text not null default 'unknown' check (acc_status in ('on', 'off', 'unknown')),
  relay_status text not null default 'unknown' check (relay_status in ('cut', 'restored', 'unknown')),
  vehicle_voltage numeric(6,2),
  located_at timestamptz,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.protocol_parse_errors (
  id uuid primary key default gen_random_uuid(),
  raw_log_id uuid not null references public.raw_device_logs(id) on delete cascade,
  parser_version text,
  error_type text not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  device_id uuid references public.gps_devices(id) on delete set null,
  vehicle_id uuid references public.gps_vehicles(id) on delete set null,
  operation_type text not null check (operation_type in ('safe_cut', 'restore', 'arm', 'disarm')),
  confirmation_text text not null,
  reason text not null,
  request_payload jsonb not null default '{}'::jsonb,
  result_status text not null default 'queued' check (result_status in ('queued', 'sent', 'acknowledged', 'failed', 'cancelled')),
  result_message text,
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table if not exists public.device_command_queue (
  id uuid primary key default gen_random_uuid(),
  operation_log_id uuid references public.operation_logs(id) on delete set null,
  device_id uuid not null references public.gps_devices(id) on delete cascade,
  command_type text not null check (command_type in ('safe_cut', 'restore', 'arm', 'disarm')),
  command_payload jsonb not null default '{}'::jsonb,
  command_hex text,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'acknowledged', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error_message text,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.gps_latest_positions as
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
order by p.device_id, p.received_at desc, p.created_at desc;

create index if not exists gps_customers_contract_status_idx on public.gps_customers(contract_status);
create index if not exists gps_customers_contract_type_idx on public.gps_customers(contract_type);
create index if not exists gps_customers_full_name_idx on public.gps_customers(full_name);

create index if not exists gps_vehicles_customer_id_idx on public.gps_vehicles(customer_id);
create index if not exists gps_vehicles_vehicle_type_idx on public.gps_vehicles(vehicle_type);
create index if not exists gps_vehicles_license_plate_idx on public.gps_vehicles(license_plate);
create index if not exists gps_vehicles_vin_idx on public.gps_vehicles(vin);

create index if not exists gps_devices_vehicle_id_idx on public.gps_devices(vehicle_id);
create index if not exists gps_devices_connection_status_idx on public.gps_devices(connection_status);
create index if not exists gps_devices_last_seen_at_idx on public.gps_devices(last_seen_at desc);

create index if not exists gps_positions_device_received_idx on public.gps_positions(device_id, received_at desc);
create index if not exists gps_positions_vehicle_received_idx on public.gps_positions(vehicle_id, received_at desc);
create index if not exists gps_positions_received_at_idx on public.gps_positions(received_at desc);

create index if not exists raw_device_logs_received_at_idx on public.raw_device_logs(received_at desc);
create index if not exists raw_device_logs_device_identifier_idx on public.raw_device_logs(device_identifier);
create index if not exists raw_device_logs_imei_idx on public.raw_device_logs(imei);
create index if not exists raw_device_logs_packet_type_idx on public.raw_device_logs(packet_type);
create index if not exists raw_device_logs_parse_status_idx on public.raw_device_logs(parse_status);

create index if not exists protocol_parse_errors_raw_log_id_idx on public.protocol_parse_errors(raw_log_id);
create index if not exists operation_logs_actor_profile_id_idx on public.operation_logs(actor_profile_id);
create index if not exists operation_logs_device_id_idx on public.operation_logs(device_id);
create index if not exists operation_logs_vehicle_id_idx on public.operation_logs(vehicle_id);
create index if not exists operation_logs_created_at_idx on public.operation_logs(created_at desc);
create index if not exists device_command_queue_device_status_idx on public.device_command_queue(device_id, status);
create index if not exists device_command_queue_status_queued_idx on public.device_command_queue(status, queued_at);

alter table public.gps_customers enable row level security;
alter table public.gps_vehicles enable row level security;
alter table public.gps_devices enable row level security;
alter table public.gps_positions enable row level security;
alter table public.raw_device_logs enable row level security;
alter table public.protocol_parse_errors enable row level security;
alter table public.operation_logs enable row level security;
alter table public.device_command_queue enable row level security;

grant select, insert, update, delete on public.gps_customers to authenticated, service_role;
grant select, insert, update, delete on public.gps_vehicles to authenticated, service_role;
grant select, insert, update, delete on public.gps_devices to authenticated, service_role;
grant select, insert, update, delete on public.gps_positions to authenticated, service_role;
grant select, insert, update, delete on public.raw_device_logs to authenticated, service_role;
grant select, insert, update, delete on public.protocol_parse_errors to authenticated, service_role;
grant select, insert, update, delete on public.operation_logs to authenticated, service_role;
grant select, insert, update, delete on public.device_command_queue to authenticated, service_role;
grant select on public.gps_latest_positions to authenticated, service_role;

drop policy if exists "admins manage gps customers" on public.gps_customers;
create policy "admins manage gps customers" on public.gps_customers
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage gps vehicles" on public.gps_vehicles;
create policy "admins manage gps vehicles" on public.gps_vehicles
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage gps devices" on public.gps_devices;
create policy "admins manage gps devices" on public.gps_devices
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage gps positions" on public.gps_positions;
create policy "admins manage gps positions" on public.gps_positions
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage raw device logs" on public.raw_device_logs;
create policy "admins manage raw device logs" on public.raw_device_logs
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage protocol parse errors" on public.protocol_parse_errors;
create policy "admins manage protocol parse errors" on public.protocol_parse_errors
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage operation logs" on public.operation_logs;
create policy "admins manage operation logs" on public.operation_logs
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "admins manage device command queue" on public.device_command_queue;
create policy "admins manage device command queue" on public.device_command_queue
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

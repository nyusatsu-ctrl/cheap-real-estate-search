create extension if not exists "pgcrypto";

create table if not exists public.property_crawl_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  name text not null,
  url text not null,
  list_url text,
  category text not null default 'akiya',
  rank text not null default 'C' check (rank in ('A', 'B', 'C', 'D')),
  crawl_method text not null default 'html',
  adapter_name text not null,
  crawl_policy text not null default 'manual_only' check (crawl_policy in ('allow', 'allow_with_rate_limit', 'manual_only', 'disallow')),
  robots_status text not null default 'unknown' check (robots_status in ('unknown', 'allowed', 'disallowed', 'not_found', 'error', 'manual_review')),
  robots_checked_at timestamptz,
  robots_note text,
  terms_checked_at timestamptz,
  terms_note text,
  is_active boolean not null default true,
  crawl_frequency text not null default 'manual' check (crawl_frequency in ('hourly', 'daily', 'weekly', 'manual')),
  rate_limit_ms integer not null default 2000 check (rate_limit_ms >= 0),
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  error_message text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.property_crawl_sources(id) on delete set null,
  source_key text,
  mode text not null default 'dry_run' check (mode in ('dry_run', 'commit')),
  status text not null default 'running' check (status in ('running', 'success', 'partial_success', 'failed', 'skipped')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  found_count integer not null default 0 check (found_count >= 0),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.property_snapshots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  crawl_run_id uuid references public.property_crawl_runs(id) on delete set null,
  source_id uuid references public.property_crawl_sources(id) on delete set null,
  source_key text,
  source_url text not null,
  duplicate_key text,
  content_hash text not null,
  title text not null,
  title_normalized text,
  price_yen integer,
  raw_price_text text,
  prefecture text,
  city text,
  address_display text,
  property_type text,
  property_category text,
  land_area_m2 numeric(10,2),
  building_area_m2 numeric(10,2),
  source_published_at timestamptz,
  source_updated_at timestamptz,
  captured_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.property_crawl_errors (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.property_crawl_sources(id) on delete set null,
  crawl_run_id uuid references public.property_crawl_runs(id) on delete set null,
  source_key text,
  url text,
  error_type text not null default 'unknown',
  error_message text not null,
  status_code integer,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.properties
  add column if not exists crawler_source_id uuid references public.property_crawl_sources(id) on delete set null,
  add column if not exists source_external_id text,
  add column if not exists source_listing_url text,
  add column if not exists raw_price_text text,
  add column if not exists title_normalized text,
  add column if not exists prefecture_code text,
  add column if not exists city_code text,
  add column if not exists area_block text,
  add column if not exists duplicate_key text,
  add column if not exists content_hash text,
  add column if not exists changed_fields text[] not null default '{}',
  add column if not exists source_removed_at timestamptz,
  add column if not exists crawl_status text;

create index if not exists property_crawl_sources_source_key_idx
on public.property_crawl_sources (source_key);

create index if not exists property_crawl_sources_active_idx
on public.property_crawl_sources (is_active, crawl_policy, crawl_frequency);

create index if not exists property_crawl_runs_source_started_idx
on public.property_crawl_runs (source_key, started_at desc);

create index if not exists property_crawl_runs_status_idx
on public.property_crawl_runs (status, started_at desc);

create index if not exists property_snapshots_property_created_idx
on public.property_snapshots (property_id, created_at desc);

create index if not exists property_snapshots_duplicate_key_idx
on public.property_snapshots (duplicate_key);

create index if not exists property_snapshots_content_hash_idx
on public.property_snapshots (content_hash);

create index if not exists property_crawl_errors_source_created_idx
on public.property_crawl_errors (source_key, created_at desc);

create index if not exists properties_crawler_source_id_idx
on public.properties (crawler_source_id);

create index if not exists properties_source_external_id_idx
on public.properties (source_external_id);

create index if not exists properties_duplicate_key_idx
on public.properties (duplicate_key);

create index if not exists properties_content_hash_idx
on public.properties (content_hash);

create index if not exists properties_area_block_idx
on public.properties (area_block);

alter table public.property_crawl_sources enable row level security;
alter table public.property_crawl_runs enable row level security;
alter table public.property_snapshots enable row level security;
alter table public.property_crawl_errors enable row level security;

grant select on public.property_crawl_sources to anon, authenticated;
grant select on public.property_crawl_runs to authenticated;
grant select on public.property_snapshots to authenticated;
grant select on public.property_crawl_errors to authenticated;

grant select, insert, update, delete on public.property_crawl_sources to authenticated;
grant select, insert, update, delete on public.property_crawl_runs to authenticated;
grant select, insert, update, delete on public.property_snapshots to authenticated;
grant select, insert, update, delete on public.property_crawl_errors to authenticated;

grant all on public.property_crawl_sources to service_role;
grant all on public.property_crawl_runs to service_role;
grant all on public.property_snapshots to service_role;
grant all on public.property_crawl_errors to service_role;

select
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'property_crawl_sources',
    'property_crawl_runs',
    'property_snapshots',
    'property_crawl_errors'
  )
order by table_name, ordinal_position;

alter table public.properties
  add column if not exists property_category text,
  add column if not exists transaction_type text,
  add column if not exists listed_at timestamptz,
  add column if not exists source_published_at timestamptz,
  add column if not exists source_updated_at timestamptz,
  add column if not exists scraped_at timestamptz,
  add column if not exists first_detected_at timestamptz,
  add column if not exists last_checked_at timestamptz,
  add column if not exists last_changed_at timestamptz,
  add column if not exists has_updates boolean not null default false,
  add column if not exists previous_snapshot_hash text,
  add column if not exists price_band text,
  add column if not exists risk_tags text[] not null default '{}',
  add column if not exists remarks text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'property_type'
  ) then
    execute 'update public.properties set property_category = property_type where property_category is null';
  end if;
end $$;

do $$
declare
  detected_sources text[] := array[]::text[];
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'created_at'
  ) then
    detected_sources := array_append(detected_sources, 'created_at');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'listed_at'
  ) then
    detected_sources := array_append(detected_sources, 'listed_at');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'updated_at'
  ) then
    detected_sources := array_append(detected_sources, 'updated_at');
  end if;

  if array_length(detected_sources, 1) is null then
    execute 'update public.properties set first_detected_at = now() where first_detected_at is null';
  else
    execute format(
      'update public.properties set first_detected_at = coalesce(%s, now()) where first_detected_at is null',
      array_to_string(detected_sources, ', ')
    );
  end if;
end $$;

do $$
declare
  checked_sources text[] := array[]::text[];
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'scraped_at'
  ) then
    checked_sources := array_append(checked_sources, 'scraped_at');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'updated_at'
  ) then
    checked_sources := array_append(checked_sources, 'updated_at');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'created_at'
  ) then
    checked_sources := array_append(checked_sources, 'created_at');
  end if;

  if array_length(checked_sources, 1) is null then
    execute 'update public.properties set last_checked_at = now() where last_checked_at is null';
  else
    execute format(
      'update public.properties set last_checked_at = coalesce(%s, now()) where last_checked_at is null',
      array_to_string(checked_sources, ', ')
    );
  end if;
end $$;

do $$
declare
  changed_sources text[] := array[]::text[];
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'updated_at'
  ) then
    changed_sources := array_append(changed_sources, 'updated_at');
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'created_at'
  ) then
    changed_sources := array_append(changed_sources, 'created_at');
  end if;

  if array_length(changed_sources, 1) is null then
    execute 'update public.properties set last_changed_at = now() where last_changed_at is null';
  else
    execute format(
      'update public.properties set last_changed_at = coalesce(%s, now()) where last_changed_at is null',
      array_to_string(changed_sources, ', ')
    );
  end if;
end $$;

update public.properties
set source_published_at = listed_at
where source_published_at is null
  and listed_at is not null;

update public.properties
set has_updates = false
where has_updates is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'source_url'
  ) then
    execute 'create index if not exists properties_source_url_idx on public.properties (source_url)';
  end if;
end $$;

do $$
begin
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name in ('address_display', 'price_yen', 'land_area_m2', 'building_area_m2')
  ) = 4 then
    execute 'create index if not exists properties_duplicate_lookup_idx on public.properties (address_display, price_yen, land_area_m2, building_area_m2)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'first_detected_at'
  ) then
    execute 'create index if not exists properties_first_detected_at_idx on public.properties (first_detected_at desc)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'source_published_at'
  ) then
    execute 'create index if not exists properties_source_published_at_idx on public.properties (source_published_at desc)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'last_checked_at'
  ) then
    execute 'create index if not exists properties_last_checked_at_idx on public.properties (last_checked_at desc)';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'property_category'
  ) then
    execute 'create index if not exists properties_property_category_idx on public.properties (property_category)';
  end if;
end $$;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name in (
    'published_at',
    'source_url',
    'address_display',
    'price_yen',
    'land_area_m2',
    'building_area_m2'
  )
order by column_name;

select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'properties'
  and column_name in (
    'property_category',
    'transaction_type',
    'listed_at',
    'source_published_at',
    'source_updated_at',
    'scraped_at',
    'first_detected_at',
    'last_checked_at',
    'last_changed_at',
    'has_updates',
    'previous_snapshot_hash',
    'price_band',
    'risk_tags',
    'remarks'
  )
order by column_name;

select
  count(*) as total_properties,
  count(first_detected_at) as first_detected_at_filled,
  count(source_published_at) as source_published_at_filled,
  count(last_checked_at) as last_checked_at_filled,
  count(last_changed_at) as last_changed_at_filled,
  count(previous_snapshot_hash) as previous_snapshot_hash_filled,
  count(*) filter (where has_updates = true) as has_updates_true_count
from public.properties;

select
  property_category,
  count(*) as count
from public.properties
group by property_category
order by property_category;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'properties'
  and indexname in (
    'properties_source_url_idx',
    'properties_duplicate_lookup_idx',
    'properties_first_detected_at_idx',
    'properties_source_published_at_idx',
    'properties_last_checked_at_idx',
    'properties_property_category_idx'
  )
order by indexname;

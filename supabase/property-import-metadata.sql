alter table public.properties
  add column if not exists transaction_type text,
  add column if not exists listed_at timestamptz,
  add column if not exists source_updated_at timestamptz,
  add column if not exists scraped_at timestamptz,
  add column if not exists price_band text,
  add column if not exists risk_tags text[] not null default '{}',
  add column if not exists remarks text;

create index if not exists properties_source_url_idx
  on public.properties (source_url);

create index if not exists properties_duplicate_lookup_idx
  on public.properties (address_display, price_yen, land_area_m2, building_area_m2);

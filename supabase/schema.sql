create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  property_type text not null check (property_type in ('land', 'old_house_land', 'detached_house', 'warehouse', 'store', 'other')),
  price_yen integer not null check (price_yen >= 0 and price_yen <= 30000000),
  prefecture text not null,
  city text not null,
  address_display text not null,
  land_area_m2 numeric(10,2),
  building_area_m2 numeric(10,2),
  construction_year integer,
  latitude numeric(9,6),
  longitude numeric(9,6),
  source_id uuid references public.property_sources(id) on delete set null,
  source_url text not null,
  publication_permission text not null default 'unknown' check (publication_permission in ('permitted', 'pending', 'denied', 'unknown')),
  status text not null default 'draft' check (status in ('draft', 'published', 'sold')),
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.estimate_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  property_title text,
  property_url text,
  requester_name text not null,
  requester_email text not null,
  requester_phone text,
  categories text[] not null default '{}',
  timeline text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'estimating', 'closed', 'cancelled')),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contractor_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  service_categories text[] not null default '{}',
  service_areas text[] not null default '{}',
  license_info text,
  insurance_info text,
  requested_commission_rate numeric(5,2) not null default 10,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.estimate_quotes (
  id uuid primary key default gen_random_uuid(),
  estimate_request_id uuid references public.estimate_requests(id) on delete cascade,
  contractor_application_id uuid references public.contractor_applications(id) on delete set null,
  contractor_display_name text not null,
  work_summary text not null,
  quote_amount_yen integer not null check (quote_amount_yen >= 0),
  platform_fee_rate numeric(5,2) not null default 10,
  platform_fee_yen integer not null default 0,
  customer_visible_amount_yen integer not null check (customer_visible_amount_yen >= 0),
  internal_note text,
  status text not null default 'submitted' check (status in ('submitted', 'presented', 'accepted', 'lost', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, property_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists sources_set_updated_at on public.property_sources;
create trigger sources_set_updated_at
before update on public.property_sources
for each row execute function public.set_updated_at();

drop trigger if exists properties_set_updated_at on public.properties;
create trigger properties_set_updated_at
before update on public.properties
for each row execute function public.set_updated_at();

drop trigger if exists estimate_requests_set_updated_at on public.estimate_requests;
create trigger estimate_requests_set_updated_at
before update on public.estimate_requests
for each row execute function public.set_updated_at();

drop trigger if exists contractor_applications_set_updated_at on public.contractor_applications;
create trigger contractor_applications_set_updated_at
before update on public.contractor_applications
for each row execute function public.set_updated_at();

drop trigger if exists estimate_quotes_set_updated_at on public.estimate_quotes;
create trigger estimate_quotes_set_updated_at
before update on public.estimate_quotes
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    subscription_status,
    trial_ends_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    'viewer',
    'trialing',
    now() + interval '14 days'
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.property_sources enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.admin_notes enable row level security;
alter table public.estimate_requests enable row level security;
alter table public.contractor_applications enable row level security;
alter table public.estimate_quotes enable row level security;
alter table public.saved_properties enable row level security;

drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "sources_public_read" on public.property_sources;
create policy "sources_public_read"
on public.property_sources for select
to anon, authenticated
using (true);

drop policy if exists "sources_admin_all" on public.property_sources;
create policy "sources_admin_all"
on public.property_sources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "properties_public_published_read" on public.properties;
create policy "properties_public_published_read"
on public.properties for select
to anon, authenticated
using (status = 'published');

drop policy if exists "properties_admin_all" on public.properties;
create policy "properties_admin_all"
on public.properties for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "images_public_for_published_properties" on public.property_images;
create policy "images_public_for_published_properties"
on public.property_images for select
to anon, authenticated
using (
  exists (
    select 1 from public.properties
    where properties.id = property_images.property_id
      and properties.status = 'published'
  )
);

drop policy if exists "images_admin_all" on public.property_images;
create policy "images_admin_all"
on public.property_images for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "notes_admin_all" on public.admin_notes;
create policy "notes_admin_all"
on public.admin_notes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "estimate_requests_admin_all" on public.estimate_requests;
create policy "estimate_requests_admin_all"
on public.estimate_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "estimate_requests_public_insert" on public.estimate_requests;
create policy "estimate_requests_public_insert"
on public.estimate_requests for insert
to anon, authenticated
with check (true);

drop policy if exists "contractor_applications_admin_all" on public.contractor_applications;
create policy "contractor_applications_admin_all"
on public.contractor_applications for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "contractor_applications_public_insert" on public.contractor_applications;
create policy "contractor_applications_public_insert"
on public.contractor_applications for insert
to anon, authenticated
with check (true);

drop policy if exists "estimate_quotes_admin_all" on public.estimate_quotes;
create policy "estimate_quotes_admin_all"
on public.estimate_quotes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "estimate_quotes_public_insert" on public.estimate_quotes;
create policy "estimate_quotes_public_insert"
on public.estimate_quotes for insert
to anon, authenticated
with check (true);

drop policy if exists "saved_properties_owner_read" on public.saved_properties;
create policy "saved_properties_owner_read"
on public.saved_properties for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "saved_properties_owner_insert" on public.saved_properties;
create policy "saved_properties_owner_insert"
on public.saved_properties for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "saved_properties_owner_delete" on public.saved_properties;
create policy "saved_properties_owner_delete"
on public.saved_properties for delete
to authenticated
using (profile_id = auth.uid() or public.is_admin());

grant usage on schema public to anon, authenticated;

grant select on public.property_sources to anon, authenticated;
grant select on public.properties to anon, authenticated;
grant select on public.property_images to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.property_sources to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.property_images to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select, insert, update, delete on public.estimate_requests to authenticated;
grant select, insert, update, delete on public.contractor_applications to authenticated;
grant select, insert, update, delete on public.estimate_quotes to authenticated;
grant select, insert, delete on public.saved_properties to authenticated;

grant usage on schema public to service_role;
grant all on public.profiles to service_role;
grant all on public.property_sources to service_role;
grant all on public.properties to service_role;
grant all on public.property_images to service_role;
grant all on public.admin_notes to service_role;
grant all on public.estimate_requests to service_role;
grant all on public.contractor_applications to service_role;
grant all on public.estimate_quotes to service_role;
grant all on public.saved_properties to service_role;

grant insert on public.estimate_requests to anon;
grant insert on public.contractor_applications to anon;
grant insert on public.estimate_quotes to anon;

create index if not exists properties_public_search_idx
on public.properties (status, prefecture, property_type, price_yen, published_at desc);

create index if not exists property_images_property_id_idx
on public.property_images (property_id, sort_order);

create index if not exists estimate_requests_status_idx
on public.estimate_requests (status, created_at desc);

create index if not exists contractor_applications_status_idx
on public.contractor_applications (status, created_at desc);

create index if not exists estimate_quotes_request_idx
on public.estimate_quotes (estimate_request_id, status);

create index if not exists saved_properties_profile_idx
on public.saved_properties (profile_id, created_at desc);

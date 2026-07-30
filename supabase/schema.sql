create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  subscription_status text not null default 'trialing',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
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
  property_category text,
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
  transaction_type text,
  listed_at timestamptz,
  source_published_at timestamptz,
  source_updated_at timestamptz,
  scraped_at timestamptz,
  first_detected_at timestamptz,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  has_updates boolean not null default false,
  previous_snapshot_hash text,
  price_band text,
  risk_tags text[] not null default '{}',
  remarks text,
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

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  password_hash text,
  role text not null default 'viewer' check (role in ('viewer', 'admin')),
  trial_started_at timestamptz not null default now(),
  trial_end_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'past_due', 'canceled', 'unpaid')),
  plan_name text not null default '全機能プラン',
  price integer not null default 4980,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.property_trial_claims (
  email_hash text primary key,
  first_user_id uuid not null,
  latest_user_id uuid not null,
  first_claimed_at timestamptz not null default now(),
  last_regranted_at timestamptz,
  regrant_count integer not null default 0 check (regrant_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_payment_events (
  event_id text primary key,
  event_type text not null,
  user_id uuid,
  stripe_customer_id text,
  stripe_subscription_id text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists property_payment_events_received_idx
on public.property_payment_events (received_at desc);

create index if not exists property_payment_events_subscription_idx
on public.property_payment_events (stripe_subscription_id)
where stripe_subscription_id is not null;

create table if not exists public.tender_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tender_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type text not null default 'manual',
  source_name text,
  organization_type text default 'other' check (organization_type in (
    'national_government',
    'ministry',
    'defense_ministry',
    'defense_equipment_agency',
    'ground_self_defense_force',
    'maritime_self_defense_force',
    'air_self_defense_force',
    'defense_bureau',
    'defense_school',
    'defense_hospital',
    'defense_research',
    'other_defense',
    'local_branch',
    'prefecture',
    'designated_city',
    'municipality',
    'independent_agency',
    'national_university',
    'hospital_organization',
    'other'
  )),
  region text,
  prefecture text,
  base_url text,
  tender_list_url text,
  open_counter_url text,
  result_url text,
  target_types text[] not null default '{}',
  source_format text default 'html' check (source_format in ('html', 'pdf', 'excel', 'word', 'search_form', 'javascript', 'mixed')),
  crawler_type text default 'manual_only' check (crawler_type in (
    'p_portal',
    'kkj_portal',
    'generic_html',
    'generic_pdf_list',
    'defense_mod',
    'defense_unit',
    'ministry_page',
    'local_government',
    'e_procurement_system',
    'manual_only'
  )),
  crawler_difficulty text default 'medium' check (crawler_difficulty in ('low', 'medium', 'high')),
  crawl_priority text default 'C' check (crawl_priority in ('A', 'B', 'C', 'D')),
  is_active boolean not null default true,
  crawl_frequency text not null default 'daily' check (crawl_frequency in ('daily', 'weekly', 'manual')),
  last_crawled_at timestamptz,
  last_success_at timestamptz,
  last_error_at timestamptz,
  last_error_message text,
  robots_note text,
  terms_note text,
  admin_note text,
  crawl_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tender_sources add column if not exists source_name text;
alter table public.tender_sources add column if not exists organization_type text default 'other';
alter table public.tender_sources add column if not exists region text;
alter table public.tender_sources add column if not exists prefecture text;
alter table public.tender_sources add column if not exists base_url text;
alter table public.tender_sources add column if not exists tender_list_url text;
alter table public.tender_sources add column if not exists open_counter_url text;
alter table public.tender_sources add column if not exists result_url text;
alter table public.tender_sources add column if not exists target_types text[] not null default '{}';
alter table public.tender_sources add column if not exists source_format text default 'html';
alter table public.tender_sources add column if not exists crawler_type text default 'manual_only';
alter table public.tender_sources add column if not exists crawler_difficulty text default 'medium';
alter table public.tender_sources add column if not exists crawl_priority text default 'C';
alter table public.tender_sources add column if not exists last_success_at timestamptz;
alter table public.tender_sources add column if not exists last_error_at timestamptz;
alter table public.tender_sources add column if not exists last_error_message text;
alter table public.tender_sources add column if not exists robots_note text;
alter table public.tender_sources add column if not exists terms_note text;
alter table public.tender_sources add column if not exists admin_note text;
alter table public.tender_sources add column if not exists crawl_ready boolean not null default false;

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  agency_name text not null,
  tender_type text not null check (tender_type in ('goods', 'service', 'open_counter', 'unified_qualification')),
  region text not null default '全国',
  prefecture text not null,
  published_at timestamptz,
  deadline_at timestamptz,
  bid_at timestamptz,
  qualification_required boolean not null default false,
  required_qualification text,
  source_url text not null,
  pdf_url text,
  detail_memo text,
  original_label text,
  is_admin_verified boolean not null default true,
  is_new boolean not null default false,
  is_deadline_soon boolean not null default false,
  is_defense boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  source_id uuid references public.tender_sources(id) on delete set null,
  category_id uuid references public.tender_categories(id) on delete set null,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenders add column if not exists original_label text;
alter table public.tenders add column if not exists is_admin_verified boolean not null default true;

create table if not exists public.tender_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.tender_sources(id) on delete set null,
  source_name text,
  organization_type text,
  title text not null,
  agency_name text not null,
  tender_type text not null default 'unknown' check (tender_type in (
    'goods',
    'services',
    'open_counter',
    'small_discretionary',
    'qualification_required',
    'construction',
    'unknown'
  )),
  original_label text,
  region text not null default '全国',
  prefecture text not null default '未設定',
  base_location text,
  published_at timestamptz,
  deadline_at timestamptz,
  bid_at timestamptz,
  qualification_required boolean not null default false,
  required_qualification text,
  source_url text not null,
  pdf_url text,
  attachments jsonb not null default '[]'::jsonb,
  raw_text text,
  ai_summary text,
  classification_confidence numeric(5,2),
  duplicate_candidate_id uuid references public.tender_candidates(id) on delete set null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'duplicate')),
  admin_note text,
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tender_candidates add column if not exists source_name text;
alter table public.tender_candidates add column if not exists organization_type text;
alter table public.tender_candidates add column if not exists base_location text;
alter table public.tender_candidates add column if not exists attachments jsonb not null default '[]'::jsonb;

create table if not exists public.tender_crawl_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.tender_sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'success' check (status in ('success', 'partial_success', 'failed')),
  fetched_count integer not null default 0,
  created_count integer not null default 0,
  duplicate_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.past_award_results (
  id uuid primary key default gen_random_uuid(),
  agency_name text not null,
  title text not null,
  region text not null default '全国',
  prefecture text,
  business_type text,
  tender_type text check (tender_type in ('goods', 'service', 'open_counter', 'unified_qualification', 'construction', 'other')),
  winner_name text,
  award_amount_yen bigint check (award_amount_yen is null or award_amount_yen >= 0),
  planned_price_yen bigint check (planned_price_yen is null or planned_price_yen >= 0),
  win_rate numeric(6,2),
  published_at timestamptz,
  opened_at timestamptz,
  source_url text not null,
  pdf_url text,
  raw_text text,
  source_name text,
  fetched_at timestamptz,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  dedupe_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.past_award_results
alter column award_amount_yen type bigint using award_amount_yen::bigint,
alter column planned_price_yen type bigint using planned_price_yen::bigint;

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  memo text,
  status text not null default 'unchecked' check (status in ('unchecked', 'reviewing', 'preparing_quote', 'planning', 'declined', 'bid_submitted', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, tender_id)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  region text,
  prefecture text,
  tender_type text,
  keyword text,
  defense_only boolean not null default false,
  open_counter_only boolean not null default false,
  qualification_required_only boolean not null default false,
  deadline_soon_only boolean not null default false,
  email_enabled boolean not null default true,
  app_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  keyword text not null,
  created_at timestamptz not null default now(),
  unique (user_id, keyword)
);

create table if not exists public.qualification_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  body text not null,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.partner_scriveners (
  id uuid primary key default gen_random_uuid(),
  office_name text not null,
  scrivener_name text not null,
  area text,
  prefecture text,
  email text,
  phone text,
  description text,
  fee_note text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scrivener_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  company_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null,
  prefecture text not null,
  business_type text not null,
  qualification_status text not null,
  request_type text not null,
  message text not null,
  consent_privacy boolean not null default false,
  consent_share_to_scrivener boolean not null default false,
  assigned_scrivener_id uuid references public.partner_scriveners(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'shared', 'in_progress', 'contracted', 'declined', 'completed')),
  admin_note text,
  shared_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price integer not null default 29800,
  member_price integer not null default 19800,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  memo text,
  created_at timestamptz not null default now()
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

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists tender_categories_set_updated_at on public.tender_categories;
create trigger tender_categories_set_updated_at
before update on public.tender_categories
for each row execute function public.set_updated_at();

drop trigger if exists tender_sources_set_updated_at on public.tender_sources;
create trigger tender_sources_set_updated_at
before update on public.tender_sources
for each row execute function public.set_updated_at();

drop trigger if exists tenders_set_updated_at on public.tenders;
create trigger tenders_set_updated_at
before update on public.tenders
for each row execute function public.set_updated_at();

drop trigger if exists tender_candidates_set_updated_at on public.tender_candidates;
create trigger tender_candidates_set_updated_at
before update on public.tender_candidates
for each row execute function public.set_updated_at();

drop trigger if exists past_award_results_set_updated_at on public.past_award_results;
create trigger past_award_results_set_updated_at
before update on public.past_award_results
for each row execute function public.set_updated_at();

drop trigger if exists user_favorites_set_updated_at on public.user_favorites;
create trigger user_favorites_set_updated_at
before update on public.user_favorites
for each row execute function public.set_updated_at();

drop trigger if exists user_notifications_set_updated_at on public.user_notifications;
create trigger user_notifications_set_updated_at
before update on public.user_notifications
for each row execute function public.set_updated_at();

drop trigger if exists qualification_guides_set_updated_at on public.qualification_guides;
create trigger qualification_guides_set_updated_at
before update on public.qualification_guides
for each row execute function public.set_updated_at();

drop trigger if exists partner_scriveners_set_updated_at on public.partner_scriveners;
create trigger partner_scriveners_set_updated_at
before update on public.partner_scriveners
for each row execute function public.set_updated_at();

drop trigger if exists scrivener_inquiries_set_updated_at on public.scrivener_inquiries;
create trigger scrivener_inquiries_set_updated_at
before update on public.scrivener_inquiries
for each row execute function public.set_updated_at();

drop trigger if exists support_products_set_updated_at on public.support_products;
create trigger support_products_set_updated_at
before update on public.support_products
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

create or replace function public.can_access_properties()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'admin'
        or (
          p.subscription_status = 'trialing'
          and p.trial_started_at is not null
          and p.trial_ends_at is not null
          and p.trial_started_at <= now()
          and p.trial_ends_at > now()
          and p.trial_ends_at > p.trial_started_at
        )
        or (
          p.subscription_status = 'active'
          and p.current_period_end is not null
          and p.current_period_end > now()
        )
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  normalized_email_hash text;
  existing_claim text;
  trial_start timestamptz := now();
  trial_end timestamptz := now() + interval '14 days';
begin
  normalized_email := lower(trim(coalesce(new.email, '')));
  if normalized_email = '' then
    raise exception 'email is required for property trial registration';
  end if;
  normalized_email_hash := encode(extensions.digest(normalized_email, 'sha256'), 'hex');

  select email_hash
  into existing_claim
  from public.property_trial_claims
  where email_hash = normalized_email_hash
  for update;

  if existing_claim is null then
    insert into public.property_trial_claims (
      email_hash,
      first_user_id,
      latest_user_id,
      first_claimed_at
    )
    values (
      normalized_email_hash,
      new.id,
      new.id,
      trial_start
    );
  else
    update public.property_trial_claims
    set
      latest_user_id = new.id,
      updated_at = now()
    where email_hash = normalized_email_hash;
    trial_end := trial_start;
  end if;

  insert into public.profiles (
    id,
    email,
    role,
    subscription_status,
    trial_started_at,
    trial_ends_at
  )
  values (
    new.id,
    normalized_email,
    'viewer',
    case when existing_claim is null then 'trialing' else 'canceled' end,
    trial_start,
    trial_end
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

create or replace function public.admin_regrant_property_trial(
  target_user_id uuid,
  trial_days integer default 14
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
  target_email_hash text;
begin
  if not public.is_admin() and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'admin access required';
  end if;
  if trial_days < 1 or trial_days > 31 then
    raise exception 'trial_days must be between 1 and 31';
  end if;

  select lower(trim(email))
  into target_email
  from public.profiles
  where id = target_user_id;
  if target_email is null then
    raise exception 'profile not found';
  end if;
  target_email_hash := encode(extensions.digest(target_email, 'sha256'), 'hex');

  update public.profiles
  set
    subscription_status = 'trialing',
    trial_started_at = now(),
    trial_ends_at = now() + make_interval(days => trial_days),
    current_period_end = null,
    cancel_at_period_end = false,
    updated_at = now()
  where id = target_user_id;

  insert into public.property_trial_claims (
    email_hash,
    first_user_id,
    latest_user_id,
    first_claimed_at,
    last_regranted_at,
    regrant_count
  )
  values (
    target_email_hash,
    target_user_id,
    target_user_id,
    now(),
    now(),
    1
  )
  on conflict (email_hash) do update set
    latest_user_id = excluded.latest_user_id,
    last_regranted_at = now(),
    regrant_count = public.property_trial_claims.regrant_count + 1,
    updated_at = now();
end;
$$;

alter table public.profiles enable row level security;
alter table public.property_sources enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.admin_notes enable row level security;
alter table public.estimate_requests enable row level security;
alter table public.contractor_applications enable row level security;
alter table public.estimate_quotes enable row level security;
alter table public.saved_properties enable row level security;
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.property_trial_claims enable row level security;
alter table public.property_payment_events enable row level security;
alter table public.tender_categories enable row level security;
alter table public.tender_sources enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_candidates enable row level security;
alter table public.tender_crawl_logs enable row level security;
alter table public.past_award_results enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_notifications enable row level security;
alter table public.user_keywords enable row level security;
alter table public.qualification_guides enable row level security;
alter table public.partner_scriveners enable row level security;
alter table public.scrivener_inquiries enable row level security;
alter table public.support_products enable row level security;
alter table public.admin_logs enable row level security;

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
drop policy if exists "profiles_self_update" on public.profiles;

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
drop policy if exists "properties_member_read" on public.properties;
create policy "properties_member_read"
on public.properties for select
to authenticated
using (status = 'published' and public.can_access_properties());

drop policy if exists "properties_admin_all" on public.properties;
create policy "properties_admin_all"
on public.properties for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "images_public_for_published_properties" on public.property_images;
drop policy if exists "images_member_for_published_properties" on public.property_images;
create policy "images_member_for_published_properties"
on public.property_images for select
to authenticated
using (
  public.can_access_properties()
  and exists (
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
using (
  (profile_id = auth.uid() and public.can_access_properties())
  or public.is_admin()
);

drop policy if exists "saved_properties_owner_insert" on public.saved_properties;
create policy "saved_properties_owner_insert"
on public.saved_properties for insert
to authenticated
with check (profile_id = auth.uid() and public.can_access_properties());

drop policy if exists "saved_properties_owner_delete" on public.saved_properties;
create policy "saved_properties_owner_delete"
on public.saved_properties for delete
to authenticated
using (
  (profile_id = auth.uid() and public.can_access_properties())
  or public.is_admin()
);

drop policy if exists "users_read_self_or_admin" on public.users;
create policy "users_read_self_or_admin"
on public.users for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "users_admin_all" on public.users;
create policy "users_admin_all"
on public.users for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "subscriptions_read_self_or_admin" on public.subscriptions;
create policy "subscriptions_read_self_or_admin"
on public.subscriptions for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "subscriptions_admin_all" on public.subscriptions;
create policy "subscriptions_admin_all"
on public.subscriptions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "property_trial_claims_admin_read" on public.property_trial_claims;
create policy "property_trial_claims_admin_read"
on public.property_trial_claims for select
to authenticated
using (public.is_admin());

drop policy if exists "property_payment_events_admin_read" on public.property_payment_events;
create policy "property_payment_events_admin_read"
on public.property_payment_events for select
to authenticated
using (public.is_admin());

drop policy if exists "tender_categories_public_read" on public.tender_categories;
create policy "tender_categories_public_read"
on public.tender_categories for select
to anon, authenticated
using (true);

drop policy if exists "tender_categories_admin_all" on public.tender_categories;
create policy "tender_categories_admin_all"
on public.tender_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tender_sources_public_read" on public.tender_sources;
create policy "tender_sources_public_read"
on public.tender_sources for select
to anon, authenticated
using (true);

drop policy if exists "tender_sources_admin_all" on public.tender_sources;
create policy "tender_sources_admin_all"
on public.tender_sources for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tenders_public_published_read" on public.tenders;
create policy "tenders_public_published_read"
on public.tenders for select
to anon, authenticated
using (status = 'published');

drop policy if exists "tenders_admin_all" on public.tenders;
create policy "tenders_admin_all"
on public.tenders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tender_candidates_admin_all" on public.tender_candidates;
create policy "tender_candidates_admin_all"
on public.tender_candidates for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tender_crawl_logs_admin_all" on public.tender_crawl_logs;
create policy "tender_crawl_logs_admin_all"
on public.tender_crawl_logs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "past_award_results_approved_read" on public.past_award_results;
create policy "past_award_results_approved_read"
on public.past_award_results for select
to anon, authenticated
using (review_status = 'approved');

drop policy if exists "past_award_results_admin_all" on public.past_award_results;
create policy "past_award_results_admin_all"
on public.past_award_results for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "user_favorites_owner_read" on public.user_favorites;
create policy "user_favorites_owner_read"
on public.user_favorites for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_favorites_owner_insert" on public.user_favorites;
create policy "user_favorites_owner_insert"
on public.user_favorites for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_favorites_owner_update" on public.user_favorites;
create policy "user_favorites_owner_update"
on public.user_favorites for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_favorites_owner_delete" on public.user_favorites;
create policy "user_favorites_owner_delete"
on public.user_favorites for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_notifications_owner_all" on public.user_notifications;
create policy "user_notifications_owner_all"
on public.user_notifications for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_keywords_owner_all" on public.user_keywords;
create policy "user_keywords_owner_all"
on public.user_keywords for all
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "qualification_guides_public_read" on public.qualification_guides;
create policy "qualification_guides_public_read"
on public.qualification_guides for select
to anon, authenticated
using (is_published = true);

drop policy if exists "qualification_guides_admin_all" on public.qualification_guides;
create policy "qualification_guides_admin_all"
on public.qualification_guides for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "partner_scriveners_public_read" on public.partner_scriveners;
create policy "partner_scriveners_public_read"
on public.partner_scriveners for select
to anon, authenticated
using (is_active = true);

drop policy if exists "partner_scriveners_admin_all" on public.partner_scriveners;
create policy "partner_scriveners_admin_all"
on public.partner_scriveners for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "scrivener_inquiries_owner_insert" on public.scrivener_inquiries;
create policy "scrivener_inquiries_owner_insert"
on public.scrivener_inquiries for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "scrivener_inquiries_admin_all" on public.scrivener_inquiries;
create policy "scrivener_inquiries_admin_all"
on public.scrivener_inquiries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "support_products_public_read" on public.support_products;
create policy "support_products_public_read"
on public.support_products for select
to anon, authenticated
using (is_active = true);

drop policy if exists "support_products_admin_all" on public.support_products;
create policy "support_products_admin_all"
on public.support_products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_logs_admin_all" on public.admin_logs;
create policy "admin_logs_admin_all"
on public.admin_logs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant usage on schema public to anon, authenticated;

grant select on public.property_sources to anon, authenticated;
grant select on public.properties to authenticated;
grant select on public.property_images to authenticated;
grant select on public.tender_categories to anon, authenticated;
grant select on public.tender_sources to anon, authenticated;
grant select on public.tenders to anon, authenticated;
grant select on public.past_award_results to anon, authenticated;
grant select on public.qualification_guides to anon, authenticated;
grant select on public.partner_scriveners to anon, authenticated;
grant select on public.support_products to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.property_sources to authenticated;
grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.property_images to authenticated;
grant select, insert, update, delete on public.admin_notes to authenticated;
grant select, insert, update, delete on public.estimate_requests to authenticated;
grant select, insert, update, delete on public.contractor_applications to authenticated;
grant select, insert, update, delete on public.estimate_quotes to authenticated;
grant select, insert, delete on public.saved_properties to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select on public.property_trial_claims to authenticated;
grant select on public.property_payment_events to authenticated;
grant select, insert, update, delete on public.tender_categories to authenticated;
grant select, insert, update, delete on public.tender_sources to authenticated;
grant select, insert, update, delete on public.tenders to authenticated;
grant select, insert, update, delete on public.tender_candidates to authenticated;
grant select, insert, update, delete on public.tender_crawl_logs to authenticated;
grant select, insert, update, delete on public.past_award_results to authenticated;
grant select, insert, update, delete on public.user_favorites to authenticated;
grant select, insert, update, delete on public.user_notifications to authenticated;
grant select, insert, update, delete on public.user_keywords to authenticated;
grant select, insert, update, delete on public.qualification_guides to authenticated;
grant select, insert, update, delete on public.partner_scriveners to authenticated;
grant select, insert, update, delete on public.scrivener_inquiries to authenticated;
grant select, insert, update, delete on public.support_products to authenticated;
grant select, insert, update, delete on public.admin_logs to authenticated;

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
grant all on public.users to service_role;
grant all on public.subscriptions to service_role;
grant all on public.property_trial_claims to service_role;
grant all on public.property_payment_events to service_role;
grant all on public.tender_categories to service_role;
grant all on public.tender_sources to service_role;
grant all on public.tenders to service_role;
grant all on public.tender_candidates to service_role;
grant all on public.tender_crawl_logs to service_role;
grant all on public.past_award_results to service_role;
grant all on public.user_favorites to service_role;
grant all on public.user_notifications to service_role;
grant all on public.user_keywords to service_role;
grant all on public.qualification_guides to service_role;
grant all on public.partner_scriveners to service_role;
grant all on public.scrivener_inquiries to service_role;
grant all on public.support_products to service_role;
grant all on public.admin_logs to service_role;

grant insert on public.estimate_requests to anon;
grant insert on public.contractor_applications to anon;
grant insert on public.estimate_quotes to anon;

revoke select on public.properties from anon;
revoke select on public.property_images from anon;

grant execute on function public.can_access_properties() to authenticated;
grant execute on function public.admin_regrant_property_trial(uuid, integer) to authenticated, service_role;

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

create index if not exists subscriptions_user_idx
on public.subscriptions (user_id, status);

create index if not exists tenders_public_search_idx
on public.tenders (status, region, prefecture, tender_type, qualification_required, deadline_at, published_at desc);

create index if not exists tenders_source_url_idx
on public.tenders (source_url);

create index if not exists tenders_pdf_url_idx
on public.tenders (pdf_url);

create index if not exists tenders_duplicate_candidate_idx
on public.tenders (title, agency_name, deadline_at);

create index if not exists tender_sources_crawl_queue_idx
on public.tender_sources (is_active, crawl_ready, crawl_priority, crawl_frequency, last_crawled_at);

create index if not exists tender_sources_crawler_type_idx
on public.tender_sources (crawler_type, organization_type, prefecture);

create index if not exists tender_candidates_review_idx
on public.tender_candidates (review_status, fetched_at desc, created_at desc);

create index if not exists tender_candidates_source_url_idx
on public.tender_candidates (source_url);

create index if not exists tender_candidates_duplicate_idx
on public.tender_candidates (title, agency_name, deadline_at);

create index if not exists tender_crawl_logs_source_idx
on public.tender_crawl_logs (source_id, started_at desc);

create index if not exists past_award_results_search_idx
on public.past_award_results (review_status, region, prefecture, tender_type, business_type, opened_at desc);

create index if not exists past_award_results_agency_idx
on public.past_award_results (agency_name, opened_at desc);

create index if not exists past_award_results_amount_idx
on public.past_award_results (award_amount_yen, planned_price_yen, win_rate);

create unique index if not exists past_award_results_dedupe_idx
on public.past_award_results (dedupe_key)
where dedupe_key is not null;

create unique index if not exists past_award_results_agency_title_opened_idx
on public.past_award_results (agency_name, title, opened_at)
where opened_at is not null;

create index if not exists user_favorites_user_idx
on public.user_favorites (user_id, updated_at desc);

create index if not exists user_notifications_user_idx
on public.user_notifications (user_id, created_at desc);

create index if not exists scrivener_inquiries_status_idx
on public.scrivener_inquiries (status, created_at desc);

create index if not exists tender_sources_active_idx
on public.tender_sources (is_active, source_type);

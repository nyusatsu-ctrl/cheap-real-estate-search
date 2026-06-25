-- Dedicated schema for the government tender search Supabase project.
-- Apply this to a new Supabase project used only by /tenders and tender admin screens.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tender_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type text not null default 'manual',
  source_name text,
  organization_type text not null default 'other' check (organization_type in (
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
  source_format text not null default 'html' check (source_format in ('html', 'pdf', 'excel', 'word', 'search_form', 'javascript', 'mixed')),
  crawler_type text not null default 'manual_only' check (crawler_type in (
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
  crawler_difficulty text not null default 'medium' check (crawler_difficulty in ('low', 'medium', 'high')),
  crawl_priority text not null default 'C' check (crawl_priority in ('A', 'B', 'C', 'D')),
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
  updated_at timestamptz not null default now(),
  constraint tender_sources_url_unique unique (url)
);

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.tender_sources(id) on delete set null,
  source_name text,
  organization_type text,
  title text not null,
  agency_name text not null,
  tender_type text not null check (tender_type in ('goods', 'service', 'open_counter', 'unified_qualification')),
  participation_condition text not null default 'unknown' check (participation_condition in ('not_required', 'unified_qualification', 'area_specified', 'other_conditions', 'unknown')),
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
  detail_memo text,
  original_label text,
  is_admin_verified boolean not null default true,
  is_new boolean not null default false,
  is_deadline_soon boolean not null default false,
  is_defense boolean not null default false,
  status text not null default 'published' check (status in ('draft', 'published', 'archived')),
  fetched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  participation_condition text not null default 'unknown' check (participation_condition in ('not_required', 'unified_qualification', 'area_specified', 'other_conditions', 'unknown')),
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

create table if not exists public.tender_attachments (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete cascade,
  candidate_id uuid references public.tender_candidates(id) on delete cascade,
  title text,
  url text not null,
  file_type text not null default 'unknown' check (file_type in ('html', 'pdf', 'excel', 'word', 'unknown')),
  label text,
  source_text text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tender_attachments_owner_check check (
    (tender_id is not null and candidate_id is null)
    or (tender_id is null and candidate_id is not null)
  )
);

create table if not exists public.tender_crawl_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.tender_sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'success' check (status in ('success', 'partial_success', 'failed')),
  fetched_count integer not null default 0 check (fetched_count >= 0),
  created_count integer not null default 0 check (created_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.tender_source_errors (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.tender_sources(id) on delete cascade,
  crawl_log_id uuid references public.tender_crawl_logs(id) on delete set null,
  source_url text,
  error_type text,
  error_message text not null,
  status_code integer,
  occurred_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.tender_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  memo text,
  status text not null default 'unchecked' check (status in ('unchecked', 'reviewing', 'preparing_quote', 'planning', 'declined', 'bid_submitted', 'won', 'lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_favorites_user_tender_unique unique (user_id, tender_id)
);

create table if not exists public.tender_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
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
  user_id uuid,
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

drop trigger if exists tender_favorites_set_updated_at on public.tender_favorites;
create trigger tender_favorites_set_updated_at
before update on public.tender_favorites
for each row execute function public.set_updated_at();

drop trigger if exists tender_notifications_set_updated_at on public.tender_notifications;
create trigger tender_notifications_set_updated_at
before update on public.tender_notifications
for each row execute function public.set_updated_at();

drop trigger if exists partner_scriveners_set_updated_at on public.partner_scriveners;
create trigger partner_scriveners_set_updated_at
before update on public.partner_scriveners
for each row execute function public.set_updated_at();

drop trigger if exists scrivener_inquiries_set_updated_at on public.scrivener_inquiries;
create trigger scrivener_inquiries_set_updated_at
before update on public.scrivener_inquiries
for each row execute function public.set_updated_at();

drop trigger if exists past_award_results_set_updated_at on public.past_award_results;
create trigger past_award_results_set_updated_at
before update on public.past_award_results
for each row execute function public.set_updated_at();

create unique index if not exists tenders_source_url_unique_idx
on public.tenders (source_url)
where source_url <> '';

create unique index if not exists tenders_pdf_url_unique_idx
on public.tenders (pdf_url)
where pdf_url is not null and pdf_url <> '';

create unique index if not exists tenders_agency_title_deadline_idx
on public.tenders (agency_name, title, deadline_at)
where deadline_at is not null;

create index if not exists tenders_public_search_idx
on public.tenders (status, region, prefecture, tender_type, qualification_required, participation_condition, deadline_at, published_at desc);

create index if not exists tenders_source_idx
on public.tenders (source_id, fetched_at desc);

create unique index if not exists tender_candidates_source_url_unique_idx
on public.tender_candidates (source_url)
where source_url <> '';

create index if not exists tender_candidates_review_idx
on public.tender_candidates (review_status, fetched_at desc, created_at desc);

create index if not exists tender_candidates_duplicate_idx
on public.tender_candidates (title, agency_name, deadline_at);

create index if not exists tender_candidates_source_idx
on public.tender_candidates (source_id, fetched_at desc);

create unique index if not exists tender_attachments_tender_url_unique_idx
on public.tender_attachments (tender_id, url)
where tender_id is not null;

create unique index if not exists tender_attachments_candidate_url_unique_idx
on public.tender_attachments (candidate_id, url)
where candidate_id is not null;

create index if not exists tender_attachments_owner_idx
on public.tender_attachments (tender_id, candidate_id, display_order);

create index if not exists tender_sources_crawl_queue_idx
on public.tender_sources (is_active, crawl_ready, crawl_priority, crawl_frequency, last_crawled_at);

create index if not exists tender_sources_crawler_type_idx
on public.tender_sources (crawler_type, organization_type, prefecture);

create index if not exists tender_crawl_logs_source_idx
on public.tender_crawl_logs (source_id, started_at desc);

create index if not exists tender_crawl_logs_status_idx
on public.tender_crawl_logs (status, started_at desc);

create index if not exists tender_source_errors_source_idx
on public.tender_source_errors (source_id, occurred_at desc);

create index if not exists tender_source_errors_unresolved_idx
on public.tender_source_errors (resolved_at, occurred_at desc)
where resolved_at is null;

create index if not exists tender_favorites_user_idx
on public.tender_favorites (user_id, updated_at desc);

create index if not exists tender_notifications_user_idx
on public.tender_notifications (user_id, created_at desc);

create index if not exists scrivener_inquiries_status_idx
on public.scrivener_inquiries (status, created_at desc);

create index if not exists past_award_results_search_idx
on public.past_award_results (review_status, region, prefecture, tender_type, business_type, opened_at desc);

create index if not exists past_award_results_agency_idx
on public.past_award_results (agency_name, opened_at desc);

create index if not exists past_award_results_amount_idx
on public.past_award_results (award_amount_yen, planned_price_yen, win_rate);

create unique index if not exists past_award_results_dedupe_idx
on public.past_award_results (dedupe_key)
where dedupe_key is not null;

create index if not exists past_award_results_title_trgm_idx
on public.past_award_results using gin (title gin_trgm_ops);

create index if not exists past_award_results_agency_name_trgm_idx
on public.past_award_results using gin (agency_name gin_trgm_ops);

create index if not exists past_award_results_winner_name_trgm_idx
on public.past_award_results using gin (winner_name gin_trgm_ops);

alter table public.tender_sources enable row level security;
alter table public.tenders enable row level security;
alter table public.tender_candidates enable row level security;
alter table public.tender_attachments enable row level security;
alter table public.tender_crawl_logs enable row level security;
alter table public.tender_source_errors enable row level security;
alter table public.tender_favorites enable row level security;
alter table public.tender_notifications enable row level security;
alter table public.partner_scriveners enable row level security;
alter table public.scrivener_inquiries enable row level security;
alter table public.past_award_results enable row level security;

drop policy if exists "tender_sources_public_read" on public.tender_sources;
create policy "tender_sources_public_read"
on public.tender_sources for select
to anon, authenticated
using (is_active = true);

drop policy if exists "tenders_public_published_read" on public.tenders;
create policy "tenders_public_published_read"
on public.tenders for select
to anon, authenticated
using (status = 'published');

drop policy if exists "tender_attachments_public_for_published_tenders" on public.tender_attachments;
create policy "tender_attachments_public_for_published_tenders"
on public.tender_attachments for select
to anon, authenticated
using (
  tender_id is not null
  and exists (
    select 1
    from public.tenders
    where tenders.id = tender_attachments.tender_id
      and tenders.status = 'published'
  )
);

drop policy if exists "tender_favorites_owner_read" on public.tender_favorites;
create policy "tender_favorites_owner_read"
on public.tender_favorites for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tender_favorites_owner_write" on public.tender_favorites;
create policy "tender_favorites_owner_write"
on public.tender_favorites for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tender_notifications_owner_all" on public.tender_notifications;
create policy "tender_notifications_owner_all"
on public.tender_notifications for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "partner_scriveners_public_read" on public.partner_scriveners;
create policy "partner_scriveners_public_read"
on public.partner_scriveners for select
to anon, authenticated
using (is_active = true);

drop policy if exists "scrivener_inquiries_owner_insert" on public.scrivener_inquiries;
create policy "scrivener_inquiries_owner_insert"
on public.scrivener_inquiries for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "past_award_results_approved_read" on public.past_award_results;
create policy "past_award_results_approved_read"
on public.past_award_results for select
to anon, authenticated
using (review_status = 'approved');

grant usage on schema public to anon, authenticated, service_role;

grant select on public.tender_sources to anon, authenticated;
grant select on public.tenders to anon, authenticated;
grant select on public.tender_attachments to anon, authenticated;
grant select on public.partner_scriveners to anon, authenticated;
grant select on public.past_award_results to anon, authenticated;

grant select, insert, update, delete on public.tender_favorites to authenticated;
grant select, insert, update, delete on public.tender_notifications to authenticated;
grant insert on public.scrivener_inquiries to authenticated;

grant all on public.tender_sources to service_role;
grant all on public.tenders to service_role;
grant all on public.tender_candidates to service_role;
grant all on public.tender_attachments to service_role;
grant all on public.tender_crawl_logs to service_role;
grant all on public.tender_source_errors to service_role;
grant all on public.tender_favorites to service_role;
grant all on public.tender_notifications to service_role;
grant all on public.partner_scriveners to service_role;
grant all on public.scrivener_inquiries to service_role;
grant all on public.past_award_results to service_role;

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

drop trigger if exists past_award_results_set_updated_at on public.past_award_results;
create trigger past_award_results_set_updated_at
before update on public.past_award_results
for each row execute function public.set_updated_at();

alter table public.past_award_results enable row level security;

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

grant select on public.past_award_results to anon, authenticated;
grant select, insert, update, delete on public.past_award_results to authenticated;
grant all on public.past_award_results to service_role;

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

-- Performance indexes for public.past_award_results.
-- Confirm current indexes before applying:
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'past_award_results'
-- order by indexname;

create extension if not exists pg_trgm;

-- Main admin list ordering and status filters.
create index if not exists past_award_results_review_opened_created_idx
on public.past_award_results (review_status, opened_at desc, created_at desc);

create index if not exists past_award_results_opened_created_idx
on public.past_award_results (opened_at desc, created_at desc);

create index if not exists past_award_results_review_published_idx
on public.past_award_results (review_status, published_at desc);

-- Similar-award lookup. The app filters approved rows by one of these fields,
-- orders by opened_at, then scores the returned candidates in application code.
create index if not exists past_award_results_review_agency_opened_idx
on public.past_award_results (review_status, agency_name, opened_at desc, created_at desc);

create index if not exists past_award_results_review_region_opened_idx
on public.past_award_results (review_status, region, opened_at desc, created_at desc);

create index if not exists past_award_results_review_prefecture_opened_idx
on public.past_award_results (review_status, prefecture, opened_at desc, created_at desc);

create index if not exists past_award_results_review_tender_type_opened_idx
on public.past_award_results (review_status, tender_type, opened_at desc, created_at desc);

create index if not exists past_award_results_review_business_type_opened_idx
on public.past_award_results (review_status, business_type, opened_at desc, created_at desc);

-- Date filters used by admin search.
create index if not exists past_award_results_published_idx
on public.past_award_results (published_at desc);

-- Dedupe lookup; already present in the base schema, kept here for idempotence.
create unique index if not exists past_award_results_dedupe_idx
on public.past_award_results (dedupe_key)
where dedupe_key is not null;

-- Partial-match search for admin keyword filters.
create index if not exists past_award_results_title_trgm_idx
on public.past_award_results
using gin (title gin_trgm_ops);

create index if not exists past_award_results_agency_name_trgm_idx
on public.past_award_results
using gin (agency_name gin_trgm_ops);

create index if not exists past_award_results_winner_name_trgm_idx
on public.past_award_results
using gin (winner_name gin_trgm_ops);

create index if not exists past_award_results_source_name_trgm_idx
on public.past_award_results
using gin (source_name gin_trgm_ops);

create index if not exists past_award_results_business_type_trgm_idx
on public.past_award_results
using gin (business_type gin_trgm_ops);

analyze public.past_award_results;

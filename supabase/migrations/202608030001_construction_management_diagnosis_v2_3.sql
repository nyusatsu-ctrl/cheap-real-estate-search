begin;

alter table public.construction_diagnosis_sessions
  add column if not exists strategy_question_ids jsonb not null default '[]'::jsonb,
  add column if not exists strategy_question_reasons jsonb not null default '{}'::jsonb,
  add column if not exists strategy_low_score_sections jsonb not null default '[]'::jsonb,
  add column if not exists strategy_critical_sections jsonb not null default '[]'::jsonb,
  add column if not exists strategy_answers jsonb not null default '{}'::jsonb,
  add column if not exists strategy_total_questions integer not null default 0,
  add column if not exists strategy_answered_count integer not null default 0,
  add column if not exists strategy_started_at timestamptz,
  add column if not exists strategy_last_question_id text,
  add column if not exists strategy_last_saved_at timestamptz,
  add column if not exists strategy_completed_at timestamptz,
  add column if not exists strategy_result jsonb,
  add column if not exists property_search_interest text,
  add column if not exists property_search_interest_topics jsonb not null default '[]'::jsonb,
  add column if not exists property_search_interest_submitted_at timestamptz,
  add column if not exists precheck_token_hash text,
  add column if not exists precheck_token_expires_at timestamptz,
  add column if not exists precheck_started_at timestamptz,
  add column if not exists precheck_answers jsonb not null default '{}'::jsonb,
  add column if not exists precheck_completed_at timestamptz;

alter table public.construction_diagnoses
  add column if not exists strategy_question_ids jsonb not null default '[]'::jsonb,
  add column if not exists strategy_question_reasons jsonb not null default '{}'::jsonb,
  add column if not exists strategy_low_score_sections jsonb not null default '[]'::jsonb,
  add column if not exists strategy_critical_sections jsonb not null default '[]'::jsonb,
  add column if not exists strategy_answers jsonb not null default '{}'::jsonb,
  add column if not exists strategy_total_questions integer not null default 0,
  add column if not exists strategy_answered_count integer not null default 0,
  add column if not exists strategy_started_at timestamptz,
  add column if not exists strategy_last_question_id text,
  add column if not exists strategy_last_saved_at timestamptz,
  add column if not exists strategy_completed_at timestamptz,
  add column if not exists strategy_result jsonb,
  add column if not exists strategy_growth_work jsonb not null default '[]'::jsonb,
  add column if not exists strategy_maintain_work jsonb not null default '[]'::jsonb,
  add column if not exists strategy_review_work jsonb not null default '[]'::jsonb,
  add column if not exists strategy_monthly_metrics jsonb not null default '[]'::jsonb,
  add column if not exists property_search_interest text,
  add column if not exists property_search_interest_topics jsonb not null default '[]'::jsonb,
  add column if not exists property_search_interest_submitted_at timestamptz,
  add column if not exists precheck_token_hash text,
  add column if not exists precheck_token_expires_at timestamptz,
  add column if not exists precheck_started_at timestamptz,
  add column if not exists precheck_answers jsonb not null default '{}'::jsonb,
  add column if not exists precheck_completed_at timestamptz;

alter table public.construction_diagnosis_sessions
  drop constraint if exists construction_diagnosis_sessions_version_check,
  add constraint construction_diagnosis_sessions_version_check check (
    diagnosis_version in ('construction_management_diagnosis_v2_2', 'construction_management_diagnosis_v2_3')
  ),
  drop constraint if exists construction_diagnosis_sessions_status_check,
  add constraint construction_diagnosis_sessions_status_check check (
    diagnosis_status in ('short_in_progress', 'short_completed', 'strategy_in_progress', 'strategy_completed', 'detailed_in_progress', 'detailed_completed', 'abandoned', 'expired')
  ),
  drop constraint if exists construction_diagnosis_sessions_stage_check,
  add constraint construction_diagnosis_sessions_stage_check check (
    abandoned_stage is null or abandoned_stage in ('short', 'quick_result', 'strategy', 'detailed', 'precheck')
  ),
  add constraint construction_diagnosis_sessions_strategy_counts_check check (
    strategy_total_questions >= 0 and strategy_answered_count >= 0 and strategy_answered_count <= strategy_total_questions
  ),
  add constraint construction_diagnosis_sessions_strategy_json_check check (
    jsonb_typeof(strategy_question_ids) = 'array'
    and jsonb_typeof(strategy_question_reasons) = 'object'
    and jsonb_typeof(strategy_low_score_sections) = 'array'
    and jsonb_typeof(strategy_critical_sections) = 'array'
    and jsonb_typeof(strategy_answers) = 'object'
    and jsonb_typeof(property_search_interest_topics) = 'array'
    and jsonb_typeof(precheck_answers) = 'object'
  ),
  add constraint construction_diagnosis_sessions_property_interest_check check (
    property_search_interest is null or property_search_interest in ('notify', 'details', 'not_interested')
  );

alter table public.construction_diagnoses
  drop constraint if exists construction_diagnoses_status_check,
  add constraint construction_diagnoses_status_check check (
    diagnosis_status is null or diagnosis_status in ('short_in_progress', 'short_completed', 'strategy_in_progress', 'strategy_completed', 'detailed_in_progress', 'detailed_completed', 'abandoned', 'expired')
  ),
  add constraint construction_diagnoses_strategy_counts_check check (
    strategy_total_questions >= 0 and strategy_answered_count >= 0 and strategy_answered_count <= strategy_total_questions
  ),
  add constraint construction_diagnoses_strategy_json_check check (
    jsonb_typeof(strategy_question_ids) = 'array'
    and jsonb_typeof(strategy_question_reasons) = 'object'
    and jsonb_typeof(strategy_low_score_sections) = 'array'
    and jsonb_typeof(strategy_critical_sections) = 'array'
    and jsonb_typeof(strategy_answers) = 'object'
    and jsonb_typeof(strategy_growth_work) = 'array'
    and jsonb_typeof(strategy_maintain_work) = 'array'
    and jsonb_typeof(strategy_review_work) = 'array'
    and jsonb_typeof(strategy_monthly_metrics) = 'array'
    and jsonb_typeof(property_search_interest_topics) = 'array'
    and jsonb_typeof(precheck_answers) = 'object'
  ),
  add constraint construction_diagnoses_property_interest_check check (
    property_search_interest is null or property_search_interest in ('notify', 'details', 'not_interested')
  );

create index if not exists construction_diagnosis_sessions_strategy_progress_idx
  on public.construction_diagnosis_sessions (strategy_started_at, strategy_completed_at, strategy_last_saved_at desc);
create unique index if not exists construction_diagnoses_precheck_token_hash_idx
  on public.construction_diagnoses (precheck_token_hash) where precheck_token_hash is not null;

create table if not exists public.property_search_waitlist (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid references public.construction_diagnoses(id) on delete set null,
  session_id uuid references public.construction_diagnosis_sessions(id) on delete set null,
  company_name text not null,
  email text not null unique,
  primary_trade text not null,
  interest_level text not null check (interest_level in ('notify', 'details')),
  interest_topics jsonb not null default '[]'::jsonb check (jsonb_typeof(interest_topics) = 'array'),
  source text not null default 'direct',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_search_waitlist_created_idx on public.property_search_waitlist (created_at desc);
create index if not exists property_search_waitlist_interest_idx on public.property_search_waitlist (interest_level, created_at desc);

drop trigger if exists property_search_waitlist_set_updated_at on public.property_search_waitlist;
create trigger property_search_waitlist_set_updated_at
before update on public.property_search_waitlist
for each row execute function public.set_construction_diagnosis_updated_at();

alter table public.property_search_waitlist enable row level security;
revoke all on public.property_search_waitlist from anon, authenticated;
grant all on public.property_search_waitlist to service_role;

revoke all on public.construction_diagnosis_sessions from anon, authenticated;
grant all on public.construction_diagnosis_sessions to service_role;

commit;

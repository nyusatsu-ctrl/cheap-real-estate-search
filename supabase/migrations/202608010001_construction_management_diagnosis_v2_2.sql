begin;

create table if not exists public.construction_diagnosis_sessions (
  id uuid primary key,
  diagnosis_id uuid unique references public.construction_diagnoses(id) on delete set null,
  diagnosis_version text not null default 'construction_management_diagnosis_v2_2',
  lead_source text not null default 'direct',
  source_campaign text,
  primary_trade text not null,
  order_model text not null,
  employee_range text not null,
  sales_range text not null,
  public_work_intent text not null,
  short_answers jsonb not null default '{}'::jsonb,
  short_scores jsonb not null default '{}'::jsonb,
  short_axis_scores jsonb not null default '{}'::jsonb,
  short_total_score numeric(5,1),
  short_critical_flags jsonb not null default '[]'::jsonb,
  short_result jsonb,
  short_started_at timestamptz not null default now(),
  short_last_step integer not null default 0,
  short_completed_at timestamptz,
  detailed_started_at timestamptz,
  detailed_last_step integer,
  detailed_answers jsonb not null default '{}'::jsonb,
  detailed_completed_at timestamptz,
  abandoned_stage text,
  abandoned_question_id text,
  device_type text not null default '不明',
  browser_family text not null default '不明',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_diagnosis_sessions_version_check
    check (diagnosis_version = 'construction_management_diagnosis_v2_2'),
  constraint construction_diagnosis_sessions_short_answers_check
    check (jsonb_typeof(short_answers) = 'object'),
  constraint construction_diagnosis_sessions_short_scores_check
    check (jsonb_typeof(short_scores) = 'object'),
  constraint construction_diagnosis_sessions_short_axis_scores_check
    check (jsonb_typeof(short_axis_scores) = 'object'),
  constraint construction_diagnosis_sessions_short_critical_flags_check
    check (jsonb_typeof(short_critical_flags) = 'array'),
  constraint construction_diagnosis_sessions_short_total_check
    check (short_total_score is null or short_total_score between 0 and 100),
  constraint construction_diagnosis_sessions_detailed_answers_check
    check (jsonb_typeof(detailed_answers) = 'object'),
  constraint construction_diagnosis_sessions_stage_check
    check (abandoned_stage is null or abandoned_stage in ('short', 'quick_result', 'detailed'))
);

create index if not exists construction_diagnosis_sessions_created_idx
  on public.construction_diagnosis_sessions (created_at desc);

create index if not exists construction_diagnosis_sessions_short_completed_idx
  on public.construction_diagnosis_sessions (short_completed_at);

create index if not exists construction_diagnosis_sessions_detailed_completed_idx
  on public.construction_diagnosis_sessions (detailed_completed_at);

create index if not exists construction_diagnosis_sessions_trade_idx
  on public.construction_diagnosis_sessions (primary_trade);

create index if not exists construction_diagnosis_sessions_client_idx
  on public.construction_diagnosis_sessions (device_type, browser_family);

drop trigger if exists construction_diagnosis_sessions_set_updated_at
  on public.construction_diagnosis_sessions;

create trigger construction_diagnosis_sessions_set_updated_at
before update on public.construction_diagnosis_sessions
for each row
execute function public.set_construction_diagnosis_updated_at();

alter table public.construction_diagnosis_sessions enable row level security;

revoke all on public.construction_diagnosis_sessions from anon, authenticated;
grant all on public.construction_diagnosis_sessions to service_role;

alter table public.construction_diagnoses
  add column if not exists anonymous_session_id uuid unique,
  add column if not exists short_started_at timestamptz,
  add column if not exists short_last_step integer,
  add column if not exists detailed_started_at timestamptz,
  add column if not exists detailed_last_step integer,
  add column if not exists abandoned_stage text,
  add column if not exists abandoned_question_id text,
  add column if not exists device_type text,
  add column if not exists browser_family text;

create index if not exists construction_diagnoses_anonymous_session_idx
  on public.construction_diagnoses (anonymous_session_id);

commit;

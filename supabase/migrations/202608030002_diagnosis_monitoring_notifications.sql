begin;

alter table public.construction_diagnoses
  drop constraint if exists construction_diagnoses_lead_source_check,
  add constraint construction_diagnoses_lead_source_check check (
    lead_source in ('aidma', 'meta', 'lp', 'referral', 'monitor2026aug', 'direct', 'other')
  );

create table if not exists public.diagnosis_usage_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  anonymous_id text,
  session_id uuid references public.construction_diagnosis_sessions(id) on delete set null,
  diagnosis_id uuid references public.construction_diagnoses(id) on delete set null,
  event_name text not null check (event_name in (
    'diagnosis_opened', 'diagnosis_started', 'basic_info_completed',
    'short_question_answered', 'short_diagnosis_completed',
    'detailed_diagnosis_started', 'detailed_question_answered',
    'detailed_diagnosis_completed', 'company_info_submitted',
    'print_opened', 'consultation_requested', 'feedback_submitted', 'resume_opened'
  )),
  question_code text,
  step_number integer check (step_number is null or step_number >= 0),
  total_steps integer check (total_steps is null or total_steps >= 0),
  source text not null default 'direct',
  device_type text not null default '不明',
  browser_type text not null default '不明',
  created_at timestamptz not null default now()
);

create index if not exists diagnosis_usage_events_event_created_idx
  on public.diagnosis_usage_events (event_name, created_at desc);
create index if not exists diagnosis_usage_events_source_created_idx
  on public.diagnosis_usage_events (source, created_at desc);
create index if not exists diagnosis_usage_events_question_created_idx
  on public.diagnosis_usage_events (question_code, created_at desc)
  where question_code is not null;
create index if not exists diagnosis_usage_events_session_idx
  on public.diagnosis_usage_events (session_id, created_at desc);
create index if not exists diagnosis_usage_events_diagnosis_idx
  on public.diagnosis_usage_events (diagnosis_id, created_at desc);

alter table public.diagnosis_usage_events enable row level security;
revoke all on public.diagnosis_usage_events from anon, authenticated;
grant all on public.diagnosis_usage_events to service_role;

create table if not exists public.diagnosis_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_name text not null check (event_name in (
    'short_diagnosis_completed', 'detailed_diagnosis_started',
    'detailed_diagnosis_completed', 'company_info_submitted',
    'consultation_requested', 'feedback_submitted'
  )),
  session_id uuid references public.construction_diagnosis_sessions(id) on delete set null,
  diagnosis_id uuid references public.construction_diagnoses(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  provider_message_id text,
  last_error_code text,
  occurred_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnosis_notification_events_status_created_idx
  on public.diagnosis_notification_events (status, created_at desc);
create index if not exists diagnosis_notification_events_name_created_idx
  on public.diagnosis_notification_events (event_name, created_at desc);

drop trigger if exists diagnosis_notification_events_set_updated_at on public.diagnosis_notification_events;
create trigger diagnosis_notification_events_set_updated_at
before update on public.diagnosis_notification_events
for each row execute function public.set_construction_diagnosis_updated_at();

alter table public.diagnosis_notification_events enable row level security;
revoke all on public.diagnosis_notification_events from anon, authenticated;
grant all on public.diagnosis_notification_events to service_role;

commit;

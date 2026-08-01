begin;

alter table public.construction_diagnosis_sessions
  add column if not exists diagnosis_status text not null default 'short_in_progress',
  add column if not exists resume_token_hash text,
  add column if not exists resume_token_expires_at timestamptz,
  add column if not exists resume_token_created_at timestamptz,
  add column if not exists resume_count integer not null default 0,
  add column if not exists last_saved_at timestamptz,
  add column if not exists detailed_total_questions integer not null default 0,
  add column if not exists detailed_answered_count integer not null default 0,
  add column if not exists detailed_last_question_id text,
  add column if not exists detailed_current_step integer not null default 0,
  add column if not exists detailed_answer_labels jsonb not null default '{}'::jsonb;

alter table public.construction_diagnoses
  add column if not exists diagnosis_status text,
  add column if not exists resume_token_hash text,
  add column if not exists resume_token_expires_at timestamptz,
  add column if not exists resume_token_created_at timestamptz,
  add column if not exists resume_count integer not null default 0,
  add column if not exists last_saved_at timestamptz,
  add column if not exists detailed_total_questions integer not null default 0,
  add column if not exists detailed_answered_count integer not null default 0,
  add column if not exists detailed_last_question_id text,
  add column if not exists detailed_current_step integer not null default 0,
  add column if not exists detailed_answer_labels jsonb not null default '{}'::jsonb;

update public.construction_diagnosis_sessions
set
  diagnosis_status = case
    when detailed_completed_at is not null then 'detailed_completed'
    when detailed_started_at is not null then 'detailed_in_progress'
    when short_completed_at is not null then 'short_completed'
    else 'short_in_progress'
  end,
  last_saved_at = coalesce(last_saved_at, updated_at),
  detailed_last_question_id = coalesce(detailed_last_question_id, abandoned_question_id),
  detailed_current_step = coalesce(detailed_last_step, 0)
where diagnosis_status is null
   or last_saved_at is null
   or detailed_last_question_id is null;

update public.construction_diagnoses
set
  diagnosis_status = coalesce(diagnosis_status, case
    when detailed_completed_at is not null then 'detailed_completed'
    when detailed_started_at is not null then 'detailed_in_progress'
    when quick_completed_at is not null then 'short_completed'
    else 'short_in_progress'
  end),
  last_saved_at = coalesce(last_saved_at, updated_at),
  detailed_last_question_id = coalesce(detailed_last_question_id, abandoned_question_id),
  detailed_current_step = coalesce(detailed_last_step, 0);

alter table public.construction_diagnosis_sessions
  drop constraint if exists construction_diagnosis_sessions_status_check,
  add constraint construction_diagnosis_sessions_status_check
    check (diagnosis_status in ('short_in_progress', 'short_completed', 'detailed_in_progress', 'detailed_completed', 'abandoned', 'expired')),
  drop constraint if exists construction_diagnosis_sessions_resume_count_check,
  add constraint construction_diagnosis_sessions_resume_count_check check (resume_count >= 0),
  drop constraint if exists construction_diagnosis_sessions_detailed_counts_check,
  add constraint construction_diagnosis_sessions_detailed_counts_check
    check (detailed_total_questions >= 0 and detailed_answered_count >= 0 and detailed_answered_count <= detailed_total_questions),
  drop constraint if exists construction_diagnosis_sessions_detailed_current_step_check,
  add constraint construction_diagnosis_sessions_detailed_current_step_check check (detailed_current_step >= 0),
  drop constraint if exists construction_diagnosis_sessions_answer_labels_check,
  add constraint construction_diagnosis_sessions_answer_labels_check check (jsonb_typeof(detailed_answer_labels) = 'object');

alter table public.construction_diagnoses
  drop constraint if exists construction_diagnoses_status_check,
  add constraint construction_diagnoses_status_check
    check (diagnosis_status is null or diagnosis_status in ('short_in_progress', 'short_completed', 'detailed_in_progress', 'detailed_completed', 'abandoned', 'expired')),
  drop constraint if exists construction_diagnoses_resume_count_check,
  add constraint construction_diagnoses_resume_count_check check (resume_count >= 0),
  drop constraint if exists construction_diagnoses_detailed_counts_check,
  add constraint construction_diagnoses_detailed_counts_check
    check (detailed_total_questions >= 0 and detailed_answered_count >= 0 and detailed_answered_count <= detailed_total_questions),
  drop constraint if exists construction_diagnoses_detailed_current_step_check,
  add constraint construction_diagnoses_detailed_current_step_check check (detailed_current_step >= 0),
  drop constraint if exists construction_diagnoses_answer_labels_check,
  add constraint construction_diagnoses_answer_labels_check check (jsonb_typeof(detailed_answer_labels) = 'object');

create unique index if not exists construction_diagnosis_sessions_resume_token_hash_idx
  on public.construction_diagnosis_sessions (resume_token_hash)
  where resume_token_hash is not null;

create index if not exists construction_diagnosis_sessions_incomplete_idx
  on public.construction_diagnosis_sessions (last_saved_at desc)
  where diagnosis_status in ('short_completed', 'detailed_in_progress', 'abandoned');

create index if not exists construction_diagnoses_status_saved_idx
  on public.construction_diagnoses (diagnosis_status, last_saved_at desc);

revoke all on public.construction_diagnosis_sessions from anon, authenticated;
grant all on public.construction_diagnosis_sessions to service_role;

commit;

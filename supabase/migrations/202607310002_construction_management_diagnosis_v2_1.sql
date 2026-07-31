begin;

alter table public.construction_diagnoses
  add column if not exists primary_trade text,
  add column if not exists secondary_trades jsonb not null default '[]'::jsonb,
  add column if not exists order_models jsonb not null default '[]'::jsonb,
  add column if not exists prime_ratio numeric(5,1),
  add column if not exists subcontract_ratio numeric(5,1),
  add column if not exists public_ratio numeric(5,1),
  add column if not exists consumer_ratio numeric(5,1),
  add column if not exists self_perform_ratio text,
  add column if not exists average_project_size text,
  add column if not exists public_work_intent text,
  add column if not exists specialty_answers jsonb not null default '{}'::jsonb,
  add column if not exists specialty_score numeric(5,1),
  add column if not exists specialty_summary jsonb,
  add column if not exists feedback_clarity smallint,
  add column if not exists feedback_accuracy smallint,
  add column if not exists feedback_usefulness smallint,
  add column if not exists feedback_consultation_interest text,
  add column if not exists feedback_comment text,
  add column if not exists feedback_submitted_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_primary_trade_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_primary_trade_check
      check (
        primary_trade is null or primary_trade in (
          'demolition', 'painting', 'renovation', 'scaffold', 'interior',
          'civil', 'building', 'exterior', 'electrical', 'plumbing',
          'waterproofing', 'roofing', 'plastering', 'landscaping',
          'other_specialty', 'multiple'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_secondary_trades_array_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_secondary_trades_array_check
      check (jsonb_typeof(secondary_trades) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_order_models_array_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_order_models_array_check
      check (jsonb_typeof(order_models) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_ratio_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_ratio_check
      check (
        (prime_ratio is null or prime_ratio between 0 and 100)
        and (subcontract_ratio is null or subcontract_ratio between 0 and 100)
        and (public_ratio is null or public_ratio between 0 and 100)
        and (consumer_ratio is null or consumer_ratio between 0 and 100)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_self_perform_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_self_perform_check
      check (
        self_perform_ratio is null or self_perform_ratio in (
          'ほぼ自社施工', '自社施工が多い', '自社施工と外注が半々',
          '外注が多い', 'ほぼ外注', '不明'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_project_size_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_project_size_check
      check (
        average_project_size is null or average_project_size in (
          '50万円未満', '50万円以上200万円未満', '200万円以上500万円未満',
          '500万円以上1,000万円未満', '1,000万円以上5,000万円未満',
          '5,000万円以上', '案件により大きく異なる', '回答しない'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_public_intent_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_public_intent_check
      check (
        public_work_intent is null or public_work_intent in (
          'participating', 'expand_within_year', 'interested_unscheduled',
          'not_interested', 'unknown'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_specialty_answers_object_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_specialty_answers_object_check
      check (jsonb_typeof(specialty_answers) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_specialty_score_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_specialty_score_check
      check (specialty_score is null or specialty_score between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_feedback_rating_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_feedback_rating_check
      check (
        (feedback_clarity is null or feedback_clarity between 1 and 5)
        and (feedback_accuracy is null or feedback_accuracy between 1 and 5)
        and (feedback_usefulness is null or feedback_usefulness between 1 and 5)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'construction_diagnoses_v21_feedback_interest_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v21_feedback_interest_check
      check (
        feedback_consultation_interest is null
        or feedback_consultation_interest in ('yes', 'neutral', 'no')
      );
  end if;
end $$;

create index if not exists construction_diagnoses_v21_primary_trade_idx
  on public.construction_diagnoses (primary_trade);

create index if not exists construction_diagnoses_v21_public_work_intent_idx
  on public.construction_diagnoses (public_work_intent);

create index if not exists construction_diagnoses_v21_feedback_submitted_idx
  on public.construction_diagnoses (feedback_submitted_at);

create index if not exists construction_diagnoses_v21_feedback_accuracy_idx
  on public.construction_diagnoses (feedback_accuracy);

create or replace function public.diagnosis_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.diagnosis_is_admin() from public;
grant execute on function public.diagnosis_is_admin() to authenticated, service_role;

drop policy if exists "Admins can read construction diagnoses"
  on public.construction_diagnoses;

create policy "Admins can read construction diagnoses"
  on public.construction_diagnoses
  for select
  to authenticated
  using (public.diagnosis_is_admin());

commit;

begin;

alter table public.construction_diagnoses
  add column if not exists diagnosis_version text not null default 'construction_sales_diagnosis_v1',
  add column if not exists representative_name text,
  add column if not exists respondent_name text,
  add column if not exists prefecture text,
  add column if not exists address text,
  add column if not exists website_url text,
  add column if not exists employee_range text,
  add column if not exists founding_year integer,
  add column if not exists sales_range text,
  add column if not exists main_business text,
  add column if not exists source text,
  add column if not exists quick_answers jsonb not null default '{}'::jsonb,
  add column if not exists quick_scores jsonb not null default '{}'::jsonb,
  add column if not exists detailed_answers jsonb not null default '{}'::jsonb,
  add column if not exists axis_scores jsonb not null default '{}'::jsonb,
  add column if not exists total_score numeric(5,1),
  add column if not exists critical_flags jsonb not null default '[]'::jsonb,
  add column if not exists judgment text,
  add column if not exists diagnosis_result jsonb,
  add column if not exists consultation_requested boolean not null default false,
  add column if not exists preferred_meeting_dates jsonb not null default '[]'::jsonb,
  add column if not exists consultation_topic text,
  add column if not exists consultation_contact_time text,
  add column if not exists consultation_notes text,
  add column if not exists meeting_at timestamptz,
  add column if not exists sales_status text not null default 'uncontacted',
  add column if not exists deal_status text not null default 'open',
  add column if not exists deal_amount numeric(14,0),
  add column if not exists loss_reason text,
  add column if not exists next_action_at timestamptz,
  add column if not exists admin_notes text,
  add column if not exists consented_at timestamptz,
  add column if not exists quick_completed_at timestamptz,
  add column if not exists detailed_completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.construction_diagnoses
set respondent_name = coalesce(respondent_name, name)
where respondent_name is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'construction_diagnoses_v2_judgment_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v2_judgment_check
      check (
        judgment is null
        or judgment in (
          '経営基盤の整備を優先',
          '自社対応可能＋必要時スポット支援',
          '一部支援推奨',
          '段階的な専門支援推奨',
          '現時点では保留'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'construction_diagnoses_v2_sales_status_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v2_sales_status_check
      check (
        sales_status in (
          'uncontacted',
          'waiting',
          'meeting_scheduled',
          'met',
          'proposal',
          'won',
          'lost',
          'on_hold'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'construction_diagnoses_v2_deal_status_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_v2_deal_status_check
      check (deal_status in ('open', 'won', 'lost', 'on_hold'));
  end if;
end $$;

create index if not exists construction_diagnoses_diagnosis_version_idx
  on public.construction_diagnoses (diagnosis_version);

create index if not exists construction_diagnoses_v2_prefecture_idx
  on public.construction_diagnoses (prefecture);

create index if not exists construction_diagnoses_v2_judgment_idx
  on public.construction_diagnoses (judgment);

create index if not exists construction_diagnoses_v2_consultation_idx
  on public.construction_diagnoses (consultation_requested);

create index if not exists construction_diagnoses_v2_sales_status_idx
  on public.construction_diagnoses (sales_status);

create index if not exists construction_diagnoses_v2_deal_status_idx
  on public.construction_diagnoses (deal_status);

create index if not exists construction_diagnoses_v2_next_action_idx
  on public.construction_diagnoses (next_action_at);

create or replace function public.set_construction_diagnosis_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists construction_diagnoses_set_updated_at
  on public.construction_diagnoses;

create trigger construction_diagnoses_set_updated_at
before update on public.construction_diagnoses
for each row
execute function public.set_construction_diagnosis_updated_at();

alter table public.construction_diagnoses enable row level security;

grant insert on public.construction_diagnoses to anon, authenticated;
grant select on public.construction_diagnoses to authenticated;
grant all on public.construction_diagnoses to service_role;

commit;

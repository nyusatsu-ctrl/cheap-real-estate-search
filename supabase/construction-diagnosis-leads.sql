alter table public.construction_diagnoses
  add column if not exists lead_source text not null default 'direct',
  add column if not exists source_campaign text,
  add column if not exists seminar_interest text not null default 'undecided',
  add column if not exists preferred_contact_time text,
  add column if not exists lead_status text not null default 'new',
  add column if not exists admin_memo text,
  add column if not exists admin_memo_updated_at timestamptz,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists lead_updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'construction_diagnoses_lead_source_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_lead_source_check
      check (lead_source in ('aidma', 'meta', 'lp', 'referral', 'direct', 'other'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'construction_diagnoses_seminar_interest_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_seminar_interest_check
      check (seminar_interest in ('wants_to_join', 'wants_schedule', 'wants_materials', 'undecided', 'not_interested'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'construction_diagnoses_lead_status_check'
  ) then
    alter table public.construction_diagnoses
      add constraint construction_diagnoses_lead_status_check
      check (lead_status in (
        'new',
        'call_scheduled',
        'contacted',
        'seminar_reserved',
        'seminar_attended',
        'consultation_scheduled',
        'proposal_sent',
        'won',
        'lost',
        'unreachable'
      ));
  end if;
end $$;

create index if not exists construction_diagnoses_lead_source_idx
  on public.construction_diagnoses (lead_source);

create index if not exists construction_diagnoses_seminar_interest_idx
  on public.construction_diagnoses (seminar_interest);

create index if not exists construction_diagnoses_lead_status_idx
  on public.construction_diagnoses (lead_status);

create index if not exists construction_diagnoses_lead_updated_at_idx
  on public.construction_diagnoses (lead_updated_at desc);

grant all on public.construction_diagnoses to service_role;

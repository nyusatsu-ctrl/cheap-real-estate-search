create extension if not exists pgcrypto;

create table if not exists public.construction_diagnoses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  phone text,
  email text not null,
  answers jsonb not null,
  scores jsonb not null,
  main_type text not null check (main_type in ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  sub_type text not null check (sub_type in ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  business_type text not null,
  monthly_sales text not null,
  wants_consultation text not null,
  created_at timestamptz not null default now()
);

create index if not exists construction_diagnoses_created_at_idx
  on public.construction_diagnoses (created_at desc);

create index if not exists construction_diagnoses_main_type_idx
  on public.construction_diagnoses (main_type);

create index if not exists construction_diagnoses_wants_consultation_idx
  on public.construction_diagnoses (wants_consultation);

alter table public.construction_diagnoses enable row level security;

drop policy if exists "Anyone can create construction diagnoses" on public.construction_diagnoses;
create policy "Anyone can create construction diagnoses"
  on public.construction_diagnoses
  for insert
  with check (true);

drop policy if exists "Admins can read construction diagnoses" on public.construction_diagnoses;
create policy "Admins can read construction diagnoses"
  on public.construction_diagnoses
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

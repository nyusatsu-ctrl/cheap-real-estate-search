begin;

create table if not exists public.construction_diagnosis_print_tokens (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references public.construction_diagnoses(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  view_count integer not null default 0,
  constraint construction_diagnosis_print_tokens_diagnosis_unique unique (diagnosis_id),
  constraint construction_diagnosis_print_tokens_hash_unique unique (token_hash),
  constraint construction_diagnosis_print_tokens_hash_check check (token_hash ~ '^[a-f0-9]{64}$'),
  constraint construction_diagnosis_print_tokens_view_count_check check (view_count >= 0)
);

create index if not exists construction_diagnosis_print_tokens_expiry_idx
  on public.construction_diagnosis_print_tokens (expires_at);

alter table public.construction_diagnosis_print_tokens enable row level security;
revoke all on public.construction_diagnosis_print_tokens from anon, authenticated;
grant all on public.construction_diagnosis_print_tokens to service_role;

comment on table public.construction_diagnosis_print_tokens is
  'Opaque, expiring access tokens for construction diagnosis print views. Raw tokens are never stored.';

commit;

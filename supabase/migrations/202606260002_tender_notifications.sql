-- Notification rules and in-app notifications for the government tender search service.
-- This migration is scoped to the dedicated /tenders Supabase project.

alter table public.tender_notifications
add column if not exists name text not null default '通知条件',
add column if not exists exclude_keyword text,
add column if not exists agency_name text,
add column if not exists participation_condition text check (
  participation_condition is null
  or participation_condition in ('not_required', 'unified_qualification', 'area_specified', 'other_conditions')
),
add column if not exists min_days_until_deadline integer not null default 0 check (min_days_until_deadline >= 0),
add column if not exists include_unknown_deadline boolean not null default true,
add column if not exists is_active boolean not null default true,
add column if not exists last_matched_at timestamptz,
add column if not exists deleted_at timestamptz;

alter table public.tender_notifications
alter column email_enabled set default false;

create table if not exists public.tender_notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notification_rule_id uuid not null references public.tender_notifications(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  match_reason text,
  is_read boolean not null default false,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tender_notification_events_unique unique (user_id, notification_rule_id, tender_id)
);

create table if not exists public.tender_notification_email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  notification_event_id uuid references public.tender_notification_events(id) on delete cascade,
  tender_id uuid references public.tenders(id) on delete cascade,
  notification_rule_id uuid references public.tender_notifications(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'disabled', 'sent', 'failed', 'cancelled')),
  provider text,
  subject text,
  error_message text,
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tender_notification_events_set_updated_at on public.tender_notification_events;
create trigger tender_notification_events_set_updated_at
before update on public.tender_notification_events
for each row execute function public.set_updated_at();

drop trigger if exists tender_notification_email_outbox_set_updated_at on public.tender_notification_email_outbox;
create trigger tender_notification_email_outbox_set_updated_at
before update on public.tender_notification_email_outbox
for each row execute function public.set_updated_at();

create index if not exists tender_notifications_user_active_idx
on public.tender_notifications (user_id, is_active, updated_at desc)
where deleted_at is null;

create index if not exists tender_notification_events_user_idx
on public.tender_notification_events (user_id, created_at desc)
where deleted_at is null;

create index if not exists tender_notification_events_unread_idx
on public.tender_notification_events (user_id, is_read, created_at desc)
where deleted_at is null;

create index if not exists tender_notification_events_rule_idx
on public.tender_notification_events (notification_rule_id, created_at desc)
where deleted_at is null;

create index if not exists tender_notification_events_tender_idx
on public.tender_notification_events (tender_id);

create index if not exists tender_notification_email_outbox_status_idx
on public.tender_notification_email_outbox (status, created_at desc);

alter table public.tender_notification_events enable row level security;
alter table public.tender_notification_email_outbox enable row level security;

drop policy if exists "tender_notification_events_owner_read" on public.tender_notification_events;
create policy "tender_notification_events_owner_read"
on public.tender_notification_events for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "tender_notification_events_owner_update" on public.tender_notification_events;
create policy "tender_notification_events_owner_update"
on public.tender_notification_events for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "tender_notification_events_owner_delete" on public.tender_notification_events;
create policy "tender_notification_events_owner_delete"
on public.tender_notification_events for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "tender_notification_email_outbox_owner_read" on public.tender_notification_email_outbox;
create policy "tender_notification_email_outbox_owner_read"
on public.tender_notification_email_outbox for select
to authenticated
using (user_id = auth.uid());

grant select, update, delete on public.tender_notification_events to authenticated;
grant select on public.tender_notification_email_outbox to authenticated;

grant all on public.tender_notification_events to service_role;
grant all on public.tender_notification_email_outbox to service_role;

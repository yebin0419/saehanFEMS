-- saehanFEMS Phase 3 — 알림 설정 + 발송 이력 테이블
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.

-- 알림 설정 (singleton: id='default')
create table if not exists public.fems_alert_config (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- 알림 이벤트 로그
create table if not exists public.fems_alert_events (
  id text primary key,
  created_at timestamptz not null default now(),
  analysis_id text references public.fems_analyses(id) on delete set null,
  equipment_id text not null,
  equipment_name text not null,
  factory text not null,
  condition_type text not null check (condition_type in ('stop_duration', 'low_utilization')),
  measured_value numeric not null,
  threshold numeric not null,
  status text not null check (status in ('sent', 'skipped_cooldown', 'failed', 'no_recipients')),
  error_message text
);

create index if not exists fems_alert_events_created_at_idx
  on public.fems_alert_events (created_at desc);

create index if not exists fems_alert_events_cooldown_idx
  on public.fems_alert_events (equipment_id, condition_type, status, created_at desc);

alter table public.fems_alert_config enable row level security;
alter table public.fems_alert_events enable row level security;

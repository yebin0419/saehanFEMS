-- saehanFEMS Phase 2 — DB 영속화 기본 테이블
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.

create table if not exists public.fems_analyses (
  id text primary key,
  created_at timestamptz not null default now(),
  factory text not null,
  period_from text,
  period_to text,
  equipment_count integer not null default 0,
  total_minutes integer not null default 0,
  utilization numeric(5,4) not null default 0,
  payload jsonb not null
);

create index if not exists fems_analyses_created_at_idx
  on public.fems_analyses (created_at desc);

create index if not exists fems_analyses_factory_idx
  on public.fems_analyses (factory);

-- RLS: Phase 3에서 인증 도입 전까지는 service_role 키로만 접근합니다.
alter table public.fems_analyses enable row level security;

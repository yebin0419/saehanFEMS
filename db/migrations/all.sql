-- =====================================================================
-- saehanFEMS · 전체 스키마 통합 스크립트 (Phase 2 ~ 5)
-- =====================================================================
-- 사용법:
--   Supabase Dashboard → SQL Editor → New Query에 전체를 붙여넣고 Run.
--   모든 DDL이 멱등(if not exists)하게 작성되어 있어 재실행해도 안전합니다.
--
-- 포함 테이블:
--   fems_analyses          — Phase 2: 분석 스냅샷
--   fems_alert_config      — Phase 3: 알림 설정 (singleton)
--   fems_alert_events      — Phase 3: 알림 발송 이력
--   fems_downtime_tags     — Phase 4: 비가동 사유 태깅
--   fems_equipments        — Phase 5: 설비 마스터
--   fems_measurements      — Phase 5: 1분 단위 전류 측정값 + Realtime
--
-- 실행 후 확인:
--   1) 모든 테이블의 RLS가 enabled인지 Database → Tables에서 확인
--   2) Database → Publications에서 supabase_realtime에 fems_measurements 포함 확인
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 1 · Phase 2 — 분석 스냅샷 영속화
-- ─────────────────────────────────────────────────────────────────────

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

alter table public.fems_analyses enable row level security;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 2 · Phase 3 — 알림 설정 + 발송 이력
-- ─────────────────────────────────────────────────────────────────────

-- 알림 설정 (singleton row: id='default')
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
  condition_type text not null check (
    condition_type in ('stop_duration', 'low_utilization')
  ),
  measured_value numeric not null,
  threshold numeric not null,
  status text not null check (
    status in ('sent', 'skipped_cooldown', 'failed', 'no_recipients')
  ),
  error_message text
);

create index if not exists fems_alert_events_created_at_idx
  on public.fems_alert_events (created_at desc);

create index if not exists fems_alert_events_cooldown_idx
  on public.fems_alert_events (equipment_id, condition_type, status, created_at desc);

alter table public.fems_alert_config enable row level security;
alter table public.fems_alert_events enable row level security;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 3 · Phase 4 — 비가동 사유 태깅
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.fems_downtime_tags (
  analysis_id text not null references public.fems_analyses(id) on delete cascade,
  interval_id text not null,
  reason text not null check (
    reason in (
      'BREAKDOWN',
      'MOLD_CHANGE',
      'MATERIAL_WAIT',
      'PLANNED_STOP',
      'QUALITY',
      'UNASSIGNED'
    )
  ),
  note text,
  updated_at timestamptz not null default now(),
  primary key (analysis_id, interval_id)
);

create index if not exists fems_downtime_tags_analysis_idx
  on public.fems_downtime_tags (analysis_id);

alter table public.fems_downtime_tags enable row level security;


-- ─────────────────────────────────────────────────────────────────────
-- SECTION 4 · Phase 5 — 설비 마스터 + 실시간 측정값
-- ─────────────────────────────────────────────────────────────────────

-- 설비 마스터
create table if not exists public.fems_equipments (
  id text primary key,
  name text not null,
  factory text not null,
  created_at timestamptz not null default now()
);

create index if not exists fems_equipments_factory_idx
  on public.fems_equipments (factory);

alter table public.fems_equipments enable row level security;


-- 측정값 (1분 단위 전류)
create table if not exists public.fems_measurements (
  equipment_id text not null,
  factory text not null,
  timestamp timestamptz not null,
  ampere numeric not null,
  primary key (equipment_id, timestamp)
);

create index if not exists fems_measurements_factory_timestamp_idx
  on public.fems_measurements (factory, timestamp desc);

create index if not exists fems_measurements_timestamp_idx
  on public.fems_measurements (timestamp desc);

alter table public.fems_measurements enable row level security;


-- Supabase Realtime: fems_measurements를 publication에 멱등하게 추가
-- (이미 등록되어 있으면 skip — alter publication은 재실행 시 에러를 던지므로 가드)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fems_measurements'
  ) then
    alter publication supabase_realtime add table public.fems_measurements;
  end if;
end
$$;


-- ─────────────────────────────────────────────────────────────────────
-- 완료 확인 쿼리 (SELECT이므로 실행해도 영향 없음)
-- ─────────────────────────────────────────────────────────────────────

-- 생성된 테이블 6개 확인
select tablename
from pg_tables
where schemaname = 'public'
  and tablename like 'fems_%'
order by tablename;

-- Realtime publication 등록 확인
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename like 'fems_%';


-- =====================================================================
-- (옵션) 파티셔닝 가이드 — 운영 규모가 커진 시점에 적용
-- =====================================================================
-- fems_measurements는 1분 간격 1설비 기준 월 ~43,200행 축적됩니다.
-- 설비 100대 × 24개월 ≈ 1억 행 — 월 단위 파티셔닝 권장.
--
-- 1) 새 파티션 테이블로 전환:
--    create table public.fems_measurements_new
--      (like public.fems_measurements including all)
--      partition by range (timestamp);
--    create table public.fems_measurements_2026_10
--      partition of public.fems_measurements_new
--      for values from ('2026-10-01') to ('2026-11-01');
--    -- 데이터 이관 후 rename
--
-- 2) pg_cron으로 매월 다음 달 파티션 자동 생성:
--    select cron.schedule(
--      'new-fems-partition',
--      '0 0 1 * *',
--      $$ create table ... partition of fems_measurements_new ... $$
--    );
-- =====================================================================

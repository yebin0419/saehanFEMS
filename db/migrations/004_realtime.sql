-- saehanFEMS Phase 5 — IoT 측정값 직접 수집 + Realtime
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.
--
-- 운영 규모 가이드:
--   fems_measurements는 1분 간격 1설비 기준 월 ~43,200행이 축적됩니다.
--   설비 100대 × 24개월 운영 시 ≈ 1억 행 — 월 단위 파티셔닝 권장.
--   아래는 선언적 파티션 예시 (주석 처리). Phase 6+에서 운영 상황에 맞춰 적용.

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

-- Supabase Realtime: 측정값 테이블을 publication에 추가
alter publication supabase_realtime add table public.fems_measurements;

-- (옵션) 월 단위 파티셔닝 — 운영 규모가 커진 시점에 적용:
--
-- 1) 새 파티션 테이블로 전환
--    create table public.fems_measurements_new (like public.fems_measurements including all)
--      partition by range (timestamp);
--    create table public.fems_measurements_2026_10 partition of public.fems_measurements_new
--      for values from ('2026-10-01') to ('2026-11-01');
--    ...
--
-- 2) pg_cron으로 매월 다음 달 파티션 자동 생성:
--    select cron.schedule('new-fems-partition', '0 0 1 * *',
--      $$ create table ... partition of fems_measurements_new ... $$);

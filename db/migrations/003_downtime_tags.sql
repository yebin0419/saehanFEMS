-- saehanFEMS Phase 4 — 비가동 사유 태깅
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용합니다.

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

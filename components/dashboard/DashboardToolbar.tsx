"use client";

import { useMemo } from "react";
import { useFems } from "@/store/fems";
import type { AnalysisResult, FiltersState } from "@/types/fems";

interface Props {
  result: AnalysisResult;
  onOpenThreshold: () => void;
}

export function DashboardToolbar({ result, onOpenThreshold }: Props) {
  const filters = useFems((s) => s.filters);
  const setFilters = useFems((s) => s.setFilters);
  const reset = useFems((s) => s.reset);

  const factories = useMemo(
    () => Array.from(new Set(result.equipments.map((e) => e.factory))),
    [result.equipments],
  );

  const confirmReset = () => {
    if (confirm("현재 분석 결과를 지우고 처음부터 다시 시작하시겠습니까?")) {
      reset();
    }
  };

  return (
    <div className="flex flex-wrap gap-3 items-center bg-surface border border-border rounded-card px-4 py-3 mb-4 shadow-card no-print">
      <Filter
        label="공장"
        value={filters.factory}
        onChange={(v) => setFilters({ factory: v })}
        options={factories.map((f) => ({ value: f, label: f }))}
      />
      <Filter
        label="설비"
        value={filters.equipment}
        onChange={(v) => setFilters({ equipment: v })}
        options={result.equipments.map((e) => ({
          value: e.id,
          label: e.name,
        }))}
      />
      <Filter<FiltersState["shift"]>
        label="교대"
        value={filters.shift}
        onChange={(v) => setFilters({ shift: v })}
        options={[
          { value: "day", label: "주간 (07:00-19:00)" },
          { value: "night", label: "야간 (19:00-07:00)" },
        ]}
      />
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onOpenThreshold}
      >
        ⚙ 상태 임계값
      </button>
      <div className="flex-1" />
      <button type="button" className="btn btn-secondary" onClick={confirmReset}>
        새 분석
      </button>
    </div>
  );
}

interface FilterProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}

function Filter<T extends string = string>({
  label,
  value,
  onChange,
  options,
}: FilterProps<T>) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-muted font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="px-2.5 py-1.5 border border-border rounded bg-white text-[13px] min-w-[120px]"
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

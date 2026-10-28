"use client";

import { useEffect, useState } from "react";
import { useFems } from "@/store/fems";
import type { StoredAnalysisRow } from "@/lib/storage/types";
import { fmtPct } from "@/lib/format";

export function RecentAnalyses() {
  const loadAnalysis = useFems((s) => s.loadAnalysis);
  const [items, setItems] = useState<StoredAnalysisRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/analyses");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: StoredAnalysisRow[] };
        if (!cancelled) setItems(data.items);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onLoad = async (id: string) => {
    setLoadingId(id);
    try {
      await loadAnalysis(id);
    } finally {
      setLoadingId(null);
    }
  };

  if (error) {
    return (
      <div className="card">
        <h2 className="m-0 mb-3 text-[15px] font-semibold">최근 저장된 분석</h2>
        <div className="text-xs text-muted">목록 로드 실패: {error}</div>
      </div>
    );
  }
  if (!items) {
    return (
      <div className="card">
        <h2 className="m-0 mb-3 text-[15px] font-semibold">최근 저장된 분석</h2>
        <div className="text-xs text-muted">불러오는 중...</div>
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card">
        <h2 className="m-0 mb-3 text-[15px] font-semibold">최근 저장된 분석</h2>
        <div className="text-xs text-muted">
          저장된 분석이 없습니다. 분석 후 대시보드 하단의 <strong>분석 저장</strong>{" "}
          버튼으로 저장할 수 있습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="m-0 mb-3 text-[15px] font-semibold">최근 저장된 분석</h2>
      <div className="grid gap-1.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => void onLoad(it.id)}
            disabled={loadingId === it.id}
            className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-border rounded text-left transition"
          >
            <div>
              <div className="text-[13px] font-medium">
                {it.factory}{" "}
                <span className="text-muted font-normal text-xs">
                  · 설비 {it.equipmentCount}대 · 가동률 {fmtPct(it.utilization)}
                </span>
              </div>
              <div className="text-[11px] text-muted">
                {new Date(it.createdAt).toLocaleString("ko-KR")} · ID {it.id}
              </div>
            </div>
            <span className="text-xs text-primary font-medium">
              {loadingId === it.id ? "불러오는 중..." : "불러오기 →"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

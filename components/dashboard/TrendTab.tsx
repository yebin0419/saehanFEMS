"use client";

import { useEffect, useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { useFems } from "@/store/fems";
import type { AnalysisResult } from "@/types/fems";
import type { StoredAnalysisRow } from "@/lib/storage/types";
import { fmtPct } from "@/lib/format";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function TrendTab({ result }: Props) {
  const showToast = useFems((s) => s.showToast);
  const [rows, setRows] = useState<StoredAnalysisRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `/api/trends?limit=30&factory=${encodeURIComponent(result.factory)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { items: StoredAnalysisRow[] };
        if (!cancelled) setRows(data.items);
      } catch (err) {
        if (!cancelled) {
          showToast(
            "추세 로드 실패: " + (err instanceof Error ? err.message : String(err)),
            "error",
          );
          setRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result.factory, showToast]);

  const delta = useMemo(() => {
    if (!rows || rows.length < 2) return null;
    const sorted = [...rows].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
    const latest = sorted[0];
    const prev = sorted[1];
    const weekAgo = sorted.find((r) => {
      const diffDays =
        (new Date(latest.createdAt).getTime() -
          new Date(r.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return diffDays >= 6 && diffDays <= 8;
    });
    return {
      latest,
      prev,
      weekAgo: weekAgo ?? null,
      vsPrev: latest.utilization - prev.utilization,
      vsWeek: weekAgo ? latest.utilization - weekAgo.utilization : null,
    };
  }, [rows]);

  const chartData = useMemo(() => {
    if (!rows) return null;
    const sorted = [...rows].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
    return {
      labels: sorted.map((r) =>
        new Date(r.createdAt).toLocaleDateString("ko-KR", {
          month: "2-digit",
          day: "2-digit",
        }),
      ),
      datasets: [
        {
          label: "가동률 (%)",
          data: sorted.map((r) => Number((r.utilization * 100).toFixed(2))),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.1)",
          tension: 0.3,
          pointRadius: 4,
          fill: true,
        },
      ],
    };
  }, [rows]);

  if (rows === null) {
    return (
      <div className="panel">
        <div className="text-center text-muted text-[13px] py-10">
          추세 데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="panel">
        <h3 className="m-0 mb-3 text-[14px] font-semibold">추세 뷰</h3>
        <div className="text-center text-muted text-[13px] py-10">
          {result.factory} 공장의 저장된 분석이 없습니다.
          <br />
          대시보드 하단의 <strong>💾 분석 저장</strong>으로 복수 일자 분석을 축적하면
          여기에 추세가 표시됩니다.
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="grid gap-3 mb-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <DeltaCard
          label="최근 분석 가동률"
          value={fmtPct(delta?.latest.utilization ?? result.utilization)}
          sub={delta ? new Date(delta.latest.createdAt).toLocaleDateString("ko-KR") : ""}
        />
        <DeltaCard
          label="전일 대비"
          value={deltaLabel(delta?.vsPrev)}
          sub={
            delta?.prev
              ? `vs ${new Date(delta.prev.createdAt).toLocaleDateString("ko-KR")}`
              : "데이터 부족"
          }
          tone={deltaTone(delta?.vsPrev)}
        />
        <DeltaCard
          label="전주 대비"
          value={deltaLabel(delta?.vsWeek ?? null)}
          sub={
            delta?.weekAgo
              ? `vs ${new Date(delta.weekAgo.createdAt).toLocaleDateString("ko-KR")}`
              : "7일 이상 축적 필요"
          }
          tone={deltaTone(delta?.vsWeek ?? null)}
        />
        <DeltaCard
          label="축적 분석 수"
          value={String(rows.length)}
          sub={`${result.factory} 공장`}
        />
      </div>

      <div className="panel">
        <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
          일별 가동률 추이
          <span className="text-[11px] text-muted font-normal">
            저장된 분석 스냅샷 기준 · 최근 {rows.length}건
          </span>
        </h3>
        <div className="relative h-[320px]">
          {chartData && (
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom" },
                  tooltip: {
                    callbacks: {
                      label: (c) => {
                        const y = c.parsed.y;
                        return `가동률 ${y == null ? "-" : y.toFixed(1)}%`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: "가동률 (%)" },
                  },
                },
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

function deltaLabel(d: number | null | undefined): string {
  if (d === null || d === undefined || !isFinite(d)) return "–";
  const pct = d * 100;
  const sign = pct > 0 ? "▲" : pct < 0 ? "▼" : "·";
  return `${sign} ${Math.abs(pct).toFixed(1)}%p`;
}

function deltaTone(d: number | null | undefined): "run" | "stop" | undefined {
  if (d === null || d === undefined || !isFinite(d)) return undefined;
  if (d > 0.005) return "run";
  if (d < -0.005) return "stop";
  return undefined;
}

interface DeltaCardProps {
  label: string;
  value: string;
  sub?: string;
  tone?: "run" | "stop";
}

function DeltaCard({ label, value, sub, tone }: DeltaCardProps) {
  const color =
    tone === "run" ? "text-run" : tone === "stop" ? "text-stop" : "";
  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-card">
      <div className="text-xs text-muted font-medium uppercase tracking-wider">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

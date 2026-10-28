"use client";

import type { AnalysisResult } from "@/types/fems";
import { fmtDuration, fmtPct } from "@/lib/format";

interface Props {
  result: AnalysisResult;
}

interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "run" | "down" | "stop";
}

export function KpiGrid({ result: r }: Props) {
  const items: KpiItem[] = [
    {
      label: "종합 가동률",
      value: fmtPct(r.utilization),
      sub: `Run ${fmtDuration(r.totalRun)}`,
    },
    {
      label: "정지 시간 (Stop)",
      value: fmtDuration(r.totalStop),
      tone: "stop",
      sub: fmtPct(r.totalMinutes ? r.totalStop / r.totalMinutes : 0),
    },
    {
      label: "저가동 (Down)",
      value: fmtDuration(r.totalDown),
      tone: "down",
      sub: fmtPct(r.totalMinutes ? r.totalDown / r.totalMinutes : 0),
    },
    {
      label: "분석 설비",
      value: String(r.equipments.length),
      unit: "대",
      sub: `공장: ${new Set(r.equipments.map((e) => e.factory)).size}`,
    },
  ];
  if (r.totalMold > 0) {
    items.push({
      label: "생산 수량",
      value: r.totalMold.toLocaleString(),
      unit: "개",
      sub: `12H 전: ${r.moldFirst12.toLocaleString()} / 후: ${r.moldLast12.toLocaleString()}`,
    });
  }

  return (
    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
      {items.map((it) => (
        <KpiCard key={it.label} item={it} />
      ))}
    </div>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  const valueColor =
    item.tone === "run"
      ? "text-run"
      : item.tone === "down"
        ? "text-down"
        : item.tone === "stop"
          ? "text-stop"
          : "";
  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-card">
      <div className="text-xs text-muted font-medium uppercase tracking-wider">
        {item.label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${valueColor}`}>
        {item.value}
        {item.unit && (
          <span className="text-[13px] text-muted ml-0.5">{item.unit}</span>
        )}
      </div>
      {item.sub && (
        <div className="text-[11px] text-muted mt-1">{item.sub}</div>
      )}
    </div>
  );
}

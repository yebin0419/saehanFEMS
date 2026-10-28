"use client";

import { Doughnut } from "react-chartjs-2";
import type { AnalysisResult } from "@/types/fems";
import { COLORS } from "@/lib/constants";
import { fmtDuration, fmtPct } from "@/lib/format";
import { ensureChartJs } from "./ChartJsRegister";

ensureChartJs();

interface Props {
  result: AnalysisResult;
}

export function StatusDoughnut({ result: r }: Props) {
  const total = r.totalMinutes || 1;
  const data = {
    labels: ["Run · 정상", "Down · 저가동", "Stop · 정지"],
    datasets: [
      {
        data: [r.totalRun, r.totalDown, r.totalStop],
        backgroundColor: [COLORS.run, COLORS.down, COLORS.stop],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  return (
    <div className="panel">
      <h3 className="m-0 mb-3 text-[14px] font-semibold flex items-center justify-between">
        상태 분포
        <span className="text-[11px] text-muted font-normal">
          전체 운영 시간 기준
        </span>
      </h3>
      <div className="relative h-[300px]">
        <Doughnut
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom", labels: { font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (c) =>
                    `${c.label}: ${fmtDuration(c.parsed)} (${fmtPct(c.parsed / total)})`,
                },
              },
            },
          }}
        />
      </div>
      <div className="flex gap-4 mt-2.5 text-[11px] text-muted">
        <LegendItem color={COLORS.run} label="Run · 정상" />
        <LegendItem color={COLORS.down} label="Down · 저가동" />
        <LegendItem color={COLORS.stop} label="Stop · 정지" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-block w-3.5 h-3.5 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
